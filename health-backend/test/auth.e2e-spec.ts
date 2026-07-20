import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';

/**
 * 실제 DB(.env의 DATABASE_*)에 연결한다. docs/insert.sql 시드 데이터(user_001 등)가
 * 미리 적용되어 있어야 한다 — health-backend/docs/ARCHITECTURE.md, ../docs/insert.sql 참고.
 */
describe('Auth API (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalInterceptors(new ResponseInterceptor());
    await app.init();
  }, 20000);

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/auth/login', () => {
    it('올바른 id/passwd면 accessToken·user를 반환하고 refreshToken은 HttpOnly 쿠키로 내려준다', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ id: 'user_001', passwd: 'user_001123!' })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.accessToken).toEqual(expect.any(String));
      expect(response.body.data.refreshToken).toBeUndefined();
      expect(response.body.data.user).toMatchObject({ userId: 'user_001', role: 'PATIENT' });

      const setCookieHeader = response.headers['set-cookie'] as unknown as string[];
      expect(
        setCookieHeader.some((cookie) => cookie.startsWith('refreshToken=') && cookie.includes('HttpOnly')),
      ).toBe(true);
    });

    it('비밀번호가 틀리면 401 INVALID_CREDENTIALS를 반환한다', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ id: 'user_001', passwd: 'wrong-password' })
        .expect(401);

      expect(response.body).toEqual({
        success: false,
        data: null,
        error: { code: 'INVALID_CREDENTIALS', message: expect.any(String) },
      });
    });

    it('id 또는 passwd가 없으면 400을 반환한다', async () => {
      await request(app.getHttpServer()).post('/api/auth/login').send({ id: 'user_001' }).expect(400);
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('로그인으로 발급받은 RefreshToken 쿠키가 있으면 새 accessToken을 반환한다', async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ id: 'user_001', passwd: 'user_001123!' })
        .expect(201);
      const refreshTokenCookie = loginResponse.headers['set-cookie'];

      const response = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .set('Cookie', refreshTokenCookie)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.accessToken).toEqual(expect.any(String));
    });

    it('RefreshToken 쿠키가 없으면 401 INVALID_REFRESH_TOKEN을 반환한다', async () => {
      const response = await request(app.getHttpServer()).post('/api/auth/refresh').expect(401);

      expect(response.body.error.code).toBe('INVALID_REFRESH_TOKEN');
    });

    it('RefreshToken 쿠키가 유효하지 않으면 401 INVALID_REFRESH_TOKEN을 반환한다', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .set('Cookie', ['refreshToken=not-a-valid-token'])
        .expect(401);

      expect(response.body.error.code).toBe('INVALID_REFRESH_TOKEN');
    });
  });
});
