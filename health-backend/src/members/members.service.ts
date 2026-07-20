import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, DataSource, MoreThanOrEqual, Repository } from 'typeorm';
import { UserBloodPressureEntity, UserBodyRecordEntity, UserDiseaseEntity, UserEntity, UserGlucoseEntity } from '../entities';
import { AppException } from '../common/exceptions/app.exception';
import { HEALTH_DATA_ENTITIES } from '../common/health-data-type';
import { toUserDto } from '../common/user-mapper';
import { toUserType } from '../common/user-role';
import { AuthenticatedUser } from '../auth/authenticated-user';
import { HealthDataQueryDto } from './dto/health-data-query.dto';
import { ListMembersQueryDto } from './dto/list-members-query.dto';

const RECENT_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class MembersService {
  constructor(
    @InjectRepository(UserEntity) private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(UserDiseaseEntity) private readonly userDiseaseRepository: Repository<UserDiseaseEntity>,
    @InjectRepository(UserBodyRecordEntity) private readonly bodyRecordRepository: Repository<UserBodyRecordEntity>,
    @InjectRepository(UserBloodPressureEntity) private readonly bloodPressureRepository: Repository<UserBloodPressureEntity>,
    @InjectRepository(UserGlucoseEntity) private readonly glucoseRepository: Repository<UserGlucoseEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async list(currentUser: AuthenticatedUser, query: ListMembersQueryDto) {
    if (currentUser.role === 'PATIENT') {
      const self = await this.userRepository.findOneBy({ userId: currentUser.userId });
      return { members: self ? [toUserDto(self)] : [] };
    }

    const qb = this.userRepository.createQueryBuilder('u').orderBy('u.user_id', 'ASC');
    if (query.userId) {
      qb.andWhere('u.user_id ILIKE :userId', { userId: `%${query.userId}%` });
    }
    if (query.role) {
      qb.andWhere('u.user_type = :userType', { userType: toUserType(query.role) });
    }
    const users = await qb.getMany();
    return { members: users.map(toUserDto) };
  }

  async detail(currentUser: AuthenticatedUser, userId: string) {
    this.assertCanAccess(currentUser, userId);

    const user = await this.userRepository.findOneBy({ userId });
    if (!user) {
      throw AppException.memberNotFound(userId);
    }

    const since = new Date(Date.now() - RECENT_DAYS_MS);
    const [diseases, recentWeights, recentBloodPressures, recentGlucoses] = await Promise.all([
      this.userDiseaseRepository.find({ where: { userId }, relations: { disease: true }, order: { diagnosedAt: 'DESC' } }),
      this.bodyRecordRepository.find({ where: { userId, measuredAt: MoreThanOrEqual(since) }, order: { measuredAt: 'DESC' } }),
      this.bloodPressureRepository.find({ where: { userId, measuredAt: MoreThanOrEqual(since) }, order: { measuredAt: 'DESC' } }),
      this.glucoseRepository.find({ where: { userId, measuredAt: MoreThanOrEqual(since) }, order: { measuredAt: 'DESC' } }),
    ]);

    return {
      member: {
        ...toUserDto(user),
        diseases: diseases.map((d) => ({ diseaseCode: d.diseaseId, nameKr: d.disease.nameKr, diagnosedAt: d.diagnosedAt })),
        memo: null,
      },
      recentWeights: recentWeights.map((w) => ({
        measuredAt: w.measuredAt,
        weightKg: Number(w.weightKg),
        bmi: Number(w.bmi),
      })),
      recentBloodPressures: recentBloodPressures.map((bp) => ({
        measuredAt: bp.measuredAt,
        systolic: bp.systolic,
        diastolic: bp.diastolic,
        status: bp.status,
      })),
      recentGlucoses: recentGlucoses.map((g) => ({
        measuredAt: g.measuredAt,
        glucoseMgDl: g.glucoseMgDl,
        status: g.status,
      })),
    };
  }

  async healthData(currentUser: AuthenticatedUser, userId: string, query: HealthDataQueryDto) {
    this.assertCanAccess(currentUser, userId);

    const startAt = new Date(query.startAt);
    const endAt = new Date(query.endAt);
    if (startAt >= endAt) {
      throw AppException.invalidDateRange();
    }

    const user = await this.userRepository.findOneBy({ userId });
    if (!user) {
      throw AppException.memberNotFound(userId);
    }

    const repository = this.dataSource.getRepository(HEALTH_DATA_ENTITIES[query.type]);
    const records = await repository.find({
      where: { userId, measuredAt: Between(startAt, endAt) } as Record<string, unknown>,
      order: { measuredAt: 'ASC' } as Record<string, 'ASC'>,
    });

    return { type: query.type, records };
  }

  private assertCanAccess(currentUser: AuthenticatedUser, userId: string): void {
    if (currentUser.role === 'PATIENT' && currentUser.userId !== userId) {
      throw AppException.forbidden();
    }
  }
}
