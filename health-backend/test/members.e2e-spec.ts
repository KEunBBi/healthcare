import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';

/**
 * 실제 DB(.env의 DATABASE_*)에 연결한다. docs/insert.sql 시드 데이터(admin, user_001 등)가
 * 미리 적용되어 있어야 한다.
 */
describe('Members API (e2e)', () => {
  let app: INestApplication<App>;
  let doctorToken: string;
  let patientToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalInterceptors(new ResponseInterceptor());
    await app.init();

    const doctorLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ id: 'admin', passwd: 'admin001123!' });
    doctorToken = doctorLogin.body.data.accessToken;

    const patientLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ id: 'user_001', passwd: 'user_001123!' });
    patientToken = patientLogin.body.data.accessToken;
  }, 20000);

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/members', () => {
    it('토큰 없이 조회하면 401 AUTH_FAILED를 반환한다', async () => {
      const response = await request(app.getHttpServer()).get('/api/members').expect(401);
      expect(response.body.error.code).toBe('AUTH_FAILED');
    });

    it('환자 계정은 조건과 무관하게 자기 자신 1건만 반환한다', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/members')
        .query({ role: 'DOCTOR', userId: 'admin' })
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.members).toHaveLength(1);
      expect(response.body.data.members[0].userId).toBe('user_001');
    });

    it('의사 계정은 조건 없이 호출하면 전체 회원을 반환한다', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/members')
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(200);

      const userIds = response.body.data.members.map((m: { userId: string }) => m.userId);
      expect(userIds.length).toBeGreaterThanOrEqual(2);
      expect(userIds).toEqual(expect.arrayContaining(['admin', 'user_001']));
    });

    it('의사 계정 + userId 부분일치 필터가 동작한다', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/members')
        .query({ userId: 'user_00' })
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(200);

      expect(response.body.data.members.length).toBeGreaterThan(0);
      for (const member of response.body.data.members) {
        expect(member.userId).toContain('user_00');
      }
    });

    it('의사 계정 + role=DOCTOR 필터가 동작한다', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/members')
        .query({ role: 'DOCTOR' })
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(200);

      expect(response.body.data.members.length).toBeGreaterThan(0);
      for (const member of response.body.data.members) {
        expect(member.role).toBe('DOCTOR');
      }
    });
  });

  describe('GET /api/members/:userId', () => {
    it('토큰 없이 조회하면 401 AUTH_FAILED를 반환한다', async () => {
      const response = await request(app.getHttpServer()).get('/api/members/user_001').expect(401);
      expect(response.body.error.code).toBe('AUTH_FAILED');
    });

    it('환자가 자기 자신을 조회하면 기본정보 + 최근 7일 체중·혈압·혈당을 반환한다', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/members/user_001')
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.member).toMatchObject({ userId: 'user_001', role: 'PATIENT' });
      expect(response.body.data.member).toHaveProperty('diseases');
      expect(response.body.data.member).toHaveProperty('memo', null);
      expect(response.body.data).toHaveProperty('recentWeights');
      expect(response.body.data).toHaveProperty('recentBloodPressures');
      expect(response.body.data).toHaveProperty('recentGlucoses');
    });

    it('의사는 임의의 회원을 조회할 수 있다', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/members/user_003')
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(200);

      expect(response.body.data.member.userId).toBe('user_003');
    });

    it('환자가 자기 자신이 아닌 회원을 조회하면 403 FORBIDDEN을 반환한다', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/members/user_002')
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(403);

      expect(response.body.error.code).toBe('FORBIDDEN');
    });

    it('존재하지 않는 회원아이디는 404 MEMBER_NOT_FOUND를 반환한다', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/members/no-such-user')
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(404);

      expect(response.body.error.code).toBe('MEMBER_NOT_FOUND');
    });
  });

  describe('GET /api/members/:userId/health-data', () => {
    const startAt = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const endAt = new Date().toISOString();

    it('토큰 없이 조회하면 401 AUTH_FAILED를 반환한다', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/members/user_001/health-data')
        .query({ type: 'heartRate', startAt, endAt })
        .expect(401);

      expect(response.body.error.code).toBe('AUTH_FAILED');
    });

    it.each(['heartRate', 'bloodPressure', 'weight', 'glucose', 'stepCount'])(
      '%s 타입을 정상 조회하면 200과 {type, records}를 반환한다',
      async (type) => {
        const response = await request(app.getHttpServer())
          .get('/api/members/user_001/health-data')
          .query({ type, startAt, endAt })
          .set('Authorization', `Bearer ${patientToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.type).toBe(type);
        expect(Array.isArray(response.body.data.records)).toBe(true);
      },
    );

    it('startAt이 endAt보다 늦으면 400 INVALID_DATE_RANGE를 반환한다', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/members/user_001/health-data')
        .query({ type: 'heartRate', startAt: endAt, endAt: startAt })
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(400);

      expect(response.body.error.code).toBe('INVALID_DATE_RANGE');
    });

    it('환자가 자기 자신이 아닌 회원의 데이터를 조회하면 403 FORBIDDEN을 반환한다', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/members/user_002/health-data')
        .query({ type: 'heartRate', startAt, endAt })
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(403);

      expect(response.body.error.code).toBe('FORBIDDEN');
    });

    it('type이 유효한 값이 아니면 400을 반환한다', async () => {
      await request(app.getHttpServer())
        .get('/api/members/user_001/health-data')
        .query({ type: 'invalidType', startAt, endAt })
        .set('Authorization', `Bearer ${patientToken}`)
        .expect(400);
    });
  });
});
