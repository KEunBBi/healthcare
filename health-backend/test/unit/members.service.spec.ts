import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource, Repository, SelectQueryBuilder } from 'typeorm';
import { MembersService } from '../../src/members/members.service';
import {
  UserBloodPressureEntity,
  UserBodyRecordEntity,
  UserDiseaseEntity,
  UserEntity,
  UserGlucoseEntity,
  UserHeartRateEntity,
} from '../../src/entities';

describe('MembersService', () => {
  let membersService: MembersService;
  let userRepository: jest.Mocked<Pick<Repository<UserEntity>, 'findOneBy' | 'createQueryBuilder'>>;
  let queryBuilder: jest.Mocked<Pick<SelectQueryBuilder<UserEntity>, 'andWhere' | 'orderBy' | 'getMany'>>;
  let userDiseaseRepository: jest.Mocked<Pick<Repository<UserDiseaseEntity>, 'find'>>;
  let bodyRecordRepository: jest.Mocked<Pick<Repository<UserBodyRecordEntity>, 'find'>>;
  let bloodPressureRepository: jest.Mocked<Pick<Repository<UserBloodPressureEntity>, 'find'>>;
  let glucoseRepository: jest.Mocked<Pick<Repository<UserGlucoseEntity>, 'find'>>;
  let healthDataRepository: jest.Mocked<Pick<Repository<UserHeartRateEntity>, 'find'>>;
  let dataSource: jest.Mocked<Pick<DataSource, 'getRepository'>>;

  const doctor = { userId: 'admin', name: '', apiKey: null, role: 'DOCTOR' as const };
  const patient = { userId: 'user_001', name: '', apiKey: null, role: 'PATIENT' as const };

  const makeUser = (overrides: Partial<UserEntity>): UserEntity => ({
    userId: 'user_001',
    password: 'hashed',
    name: '김민준',
    gender: 'M',
    birthDate: '19980722',
    userType: 'P',
    apiKey: 'key_001',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  });

  beforeEach(async () => {
    queryBuilder = {
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
    };
    userRepository = {
      findOneBy: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    };
    userDiseaseRepository = { find: jest.fn().mockResolvedValue([]) };
    bodyRecordRepository = { find: jest.fn().mockResolvedValue([]) };
    bloodPressureRepository = { find: jest.fn().mockResolvedValue([]) };
    glucoseRepository = { find: jest.fn().mockResolvedValue([]) };
    healthDataRepository = { find: jest.fn().mockResolvedValue([]) };
    dataSource = { getRepository: jest.fn().mockReturnValue(healthDataRepository) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MembersService,
        { provide: getRepositoryToken(UserEntity), useValue: userRepository },
        { provide: getRepositoryToken(UserDiseaseEntity), useValue: userDiseaseRepository },
        { provide: getRepositoryToken(UserBodyRecordEntity), useValue: bodyRecordRepository },
        { provide: getRepositoryToken(UserBloodPressureEntity), useValue: bloodPressureRepository },
        { provide: getRepositoryToken(UserGlucoseEntity), useValue: glucoseRepository },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    membersService = module.get(MembersService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('list', () => {
    it('환자 계정은 전송값과 무관하게 자기 자신 1건만 반환한다', async () => {
      userRepository.findOneBy.mockResolvedValue(makeUser({ userId: 'user_001' }));

      const result = await membersService.list(patient, { role: 'DOCTOR', userId: 'admin' });

      expect(userRepository.findOneBy).toHaveBeenCalledWith({ userId: 'user_001' });
      expect(userRepository.createQueryBuilder).not.toHaveBeenCalled();
      expect(result.members).toHaveLength(1);
      expect(result.members[0]).toMatchObject({ userId: 'user_001', role: 'PATIENT' });
    });

    it('환자 계정인데 자기 자신 데이터가 없으면 빈 배열을 반환한다', async () => {
      userRepository.findOneBy.mockResolvedValue(null);

      const result = await membersService.list(patient, {});

      expect(result.members).toEqual([]);
    });

    it('의사 계정은 조건 없이 호출하면 전체 회원을 반환한다', async () => {
      queryBuilder.getMany.mockResolvedValue([
        makeUser({ userId: 'user_001' }),
        makeUser({ userId: 'user_002', name: '이서연' }),
      ]);

      const result = await membersService.list(doctor, {});

      expect(userRepository.createQueryBuilder).toHaveBeenCalledWith('u');
      expect(queryBuilder.andWhere).not.toHaveBeenCalled();
      expect(result.members).toHaveLength(2);
    });

    it('의사 계정 + userId 필터는 ILIKE 조건으로 조회한다', async () => {
      queryBuilder.getMany.mockResolvedValue([makeUser({ userId: 'user_001' })]);

      await membersService.list(doctor, { userId: 'user_00' });

      expect(queryBuilder.andWhere).toHaveBeenCalledWith('u.user_id ILIKE :userId', { userId: '%user_00%' });
    });

    it('의사 계정 + role 필터는 DB의 user_type(D/P) 값으로 변환해 조회한다', async () => {
      queryBuilder.getMany.mockResolvedValue([]);

      await membersService.list(doctor, { role: 'DOCTOR' });

      expect(queryBuilder.andWhere).toHaveBeenCalledWith('u.user_type = :userType', { userType: 'D' });
    });
  });

  describe('detail', () => {
    it('환자 자기 자신을 조회하면 기본정보 + 보유질병 + 최근 7일 체중·혈압·혈당을 반환한다', async () => {
      userRepository.findOneBy.mockResolvedValue(makeUser({ userId: 'user_001' }));
      userDiseaseRepository.find.mockResolvedValue([
        {
          diagnosisSeq: '1',
          userId: 'user_001',
          diseaseId: 'HYP',
          disease: { diseaseId: 'HYP', nameKr: '고혈압' } as never,
          diagnosisDetail: null,
          diagnosedAt: new Date('2025-03-10T00:00:00.000Z'),
          updatedAt: new Date('2025-03-10T00:00:00.000Z'),
        },
      ]);
      bodyRecordRepository.find.mockResolvedValue([
        {
          seq: '1',
          userId: 'user_001',
          weightKg: '72.50',
          bmi: '22.9',
          skeletalMuscleMassKg: null,
          bodyFatPercentage: null,
          status: null,
          note: null,
          measuredAt: new Date('2026-07-16T08:00:00.000Z'),
          createdAt: new Date('2026-07-16T08:00:00.000Z'),
        },
      ]);
      bloodPressureRepository.find.mockResolvedValue([
        {
          seq: '1',
          userId: 'user_001',
          systolic: 118,
          diastolic: 76,
          status: null,
          note: null,
          measuredAt: new Date('2026-07-16T06:00:00.000Z'),
          createdAt: new Date('2026-07-16T06:00:00.000Z'),
        },
      ]);
      glucoseRepository.find.mockResolvedValue([
        {
          seq: '1',
          userId: 'user_001',
          glucoseMgDl: 96,
          status: 'normal',
          note: null,
          measuredAt: new Date('2026-07-16T07:00:00.000Z'),
          createdAt: new Date('2026-07-16T07:00:00.000Z'),
        },
      ]);

      const result = await membersService.detail(patient, 'user_001');

      expect(result.member).toMatchObject({
        userId: 'user_001',
        diseases: [{ diseaseCode: 'HYP', nameKr: '고혈압', diagnosedAt: new Date('2025-03-10T00:00:00.000Z') }],
        memo: null,
      });
      expect(result.recentWeights).toEqual([
        { measuredAt: new Date('2026-07-16T08:00:00.000Z'), weightKg: 72.5, bmi: 22.9 },
      ]);
      expect(result.recentBloodPressures).toEqual([
        { measuredAt: new Date('2026-07-16T06:00:00.000Z'), systolic: 118, diastolic: 76, status: null },
      ]);
      expect(result.recentGlucoses).toEqual([
        { measuredAt: new Date('2026-07-16T07:00:00.000Z'), glucoseMgDl: 96, status: 'normal' },
      ]);
    });

    it('환자가 자기 자신이 아닌 회원을 조회하면 FORBIDDEN을 던진다', async () => {
      await expect(membersService.detail(patient, 'user_002')).rejects.toMatchObject({ code: 'FORBIDDEN' });
      expect(userRepository.findOneBy).not.toHaveBeenCalled();
    });

    it('의사는 임의의 회원을 조회할 수 있다', async () => {
      userRepository.findOneBy.mockResolvedValue(makeUser({ userId: 'user_003' }));

      const result = await membersService.detail(doctor, 'user_003');

      expect(result.member.userId).toBe('user_003');
    });

    it('존재하지 않는 회원아이디는 MEMBER_NOT_FOUND를 던진다', async () => {
      userRepository.findOneBy.mockResolvedValue(null);

      await expect(membersService.detail(doctor, 'no-such-user')).rejects.toMatchObject({
        code: 'MEMBER_NOT_FOUND',
      });
    });
  });

  describe('healthData', () => {
    const validQuery = { type: 'heartRate' as const, startAt: '2026-07-16T00:00:00.000Z', endAt: '2026-07-17T00:00:00.000Z' };

    it('정상 조건이면 type에 해당하는 테이블을 기간으로 조회해 반환한다', async () => {
      userRepository.findOneBy.mockResolvedValue(makeUser({ userId: 'user_001' }));
      healthDataRepository.find.mockResolvedValue([
        { seq: '1', userId: 'user_001', heartRate: 78, status: null, note: null, measuredAt: new Date(), createdAt: new Date() },
      ]);

      const result = await membersService.healthData(patient, 'user_001', validQuery);

      expect(dataSource.getRepository).toHaveBeenCalledWith(UserHeartRateEntity);
      expect(healthDataRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ userId: 'user_001' }) }),
      );
      expect(result.type).toBe('heartRate');
      expect(result.records).toHaveLength(1);
    });

    it('startAt이 endAt보다 늦으면 INVALID_DATE_RANGE를 던진다', async () => {
      await expect(
        membersService.healthData(patient, 'user_001', {
          type: 'heartRate',
          startAt: '2026-07-17T00:00:00.000Z',
          endAt: '2026-07-16T00:00:00.000Z',
        }),
      ).rejects.toMatchObject({ code: 'INVALID_DATE_RANGE' });
      expect(userRepository.findOneBy).not.toHaveBeenCalled();
    });

    it('환자가 자기 자신이 아닌 회원의 데이터를 조회하면 FORBIDDEN을 던진다', async () => {
      await expect(membersService.healthData(patient, 'user_002', validQuery)).rejects.toMatchObject({
        code: 'FORBIDDEN',
      });
    });

    it('존재하지 않는 회원아이디는 MEMBER_NOT_FOUND를 던진다', async () => {
      userRepository.findOneBy.mockResolvedValue(null);

      await expect(membersService.healthData(doctor, 'no-such-user', validQuery)).rejects.toMatchObject({
        code: 'MEMBER_NOT_FOUND',
      });
    });
  });
});
