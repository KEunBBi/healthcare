import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import {
  UserBloodPressureEntity,
  UserBodyRecordEntity,
  UserGlucoseEntity,
  UserHeartRateEntity,
  UserStepCountEntity,
} from '../entities';

const RETENTION_DAYS = 7;

@Injectable()
export class RetentionService {
  private readonly logger = new Logger(RetentionService.name);

  constructor(
    @InjectRepository(UserHeartRateEntity) private readonly heartRateRepository: Repository<UserHeartRateEntity>,
    @InjectRepository(UserBloodPressureEntity)
    private readonly bloodPressureRepository: Repository<UserBloodPressureEntity>,
    @InjectRepository(UserBodyRecordEntity) private readonly bodyRecordRepository: Repository<UserBodyRecordEntity>,
    @InjectRepository(UserGlucoseEntity) private readonly glucoseRepository: Repository<UserGlucoseEntity>,
    @InjectRepository(UserStepCountEntity) private readonly stepCountRepository: Repository<UserStepCountEntity>,
  ) {}

  @Cron('0 10 0 * * *')
  async purgeOldRecords(): Promise<void> {
    const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
    const repositories = [
      this.heartRateRepository,
      this.bloodPressureRepository,
      this.bodyRecordRepository,
      this.glucoseRepository,
      this.stepCountRepository,
    ];

    for (const repository of repositories) {
      const result = await repository.delete({ measuredAt: LessThan(cutoff) });
      this.logger.log(`${repository.metadata.tableName}: ${result.affected ?? 0}건 삭제 (보존기간 ${RETENTION_DAYS}일 초과)`);
    }
  }
}
