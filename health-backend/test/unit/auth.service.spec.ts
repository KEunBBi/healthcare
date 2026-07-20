import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { AuthService } from '../../src/auth/auth.service';
import { AppException } from '../../src/common/exceptions/app.exception';
import { UserEntity } from '../../src/entities';

jest.mock('bcryptjs');

describe('AuthService', () => {
  let authService: AuthService;
  let userRepository: jest.Mocked<Pick<Repository<UserEntity>, 'findOneBy'>>;
  let jwtService: jest.Mocked<Pick<JwtService, 'sign' | 'verifyAsync'>>;

  const mockUser: UserEntity = {
    userId: 'user_001',
    password: 'hashed-password',
    name: '김민준',
    gender: 'M',
    birthDate: '19980722',
    userType: 'P',
    apiKey: 'key_001',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  beforeEach(async () => {
    userRepository = { findOneBy: jest.fn() };
    jwtService = { sign: jest.fn().mockReturnValue('signed-token'), verifyAsync: jest.fn() };

    const configValues: Record<string, string> = {
      JWT_ACCESS_SECRET: 'access-secret',
      JWT_REFRESH_SECRET: 'refresh-secret',
    };
    const configService: Partial<ConfigService> = {
      getOrThrow: jest.fn((key: string) => configValues[key]),
      get: jest.fn((_key: string, fallback?: unknown) => fallback),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(UserEntity), useValue: userRepository },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    authService = module.get(AuthService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('login', () => {
    it('id/passwd가 맞으면 accessToken·refreshToken·user를 반환한다', async () => {
      userRepository.findOneBy.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await authService.login({ id: 'user_001', passwd: 'user_001123!' });

      expect(result.accessToken).toBe('signed-token');
      expect(result.refreshToken).toBe('signed-token');
      expect(result.user).toMatchObject({ userId: 'user_001', role: 'PATIENT', apiKey: 'key_001' });
      expect(jwtService.sign).toHaveBeenCalledTimes(2);
    });

    it('존재하지 않는 아이디면 INVALID_CREDENTIALS를 던진다', async () => {
      userRepository.findOneBy.mockResolvedValue(null);

      await expect(authService.login({ id: 'no-such-user', passwd: 'x' })).rejects.toMatchObject({
        code: 'INVALID_CREDENTIALS',
      });
    });

    it('비밀번호가 틀리면 INVALID_CREDENTIALS를 던진다', async () => {
      userRepository.findOneBy.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(authService.login({ id: 'user_001', passwd: 'wrong' })).rejects.toBeInstanceOf(AppException);
    });
  });

  describe('refresh', () => {
    it('유효한 RefreshToken이면 새 accessToken을 반환한다', async () => {
      jwtService.verifyAsync.mockResolvedValue({ userid: 'user_001', name: '김민준', api_key: 'key_001' });
      userRepository.findOneBy.mockResolvedValue(mockUser);

      const result = await authService.refresh({ refreshToken: 'valid-refresh-token' });

      expect(result).toEqual({ accessToken: 'signed-token' });
    });

    it('RefreshToken 검증에 실패하면 INVALID_REFRESH_TOKEN을 던진다', async () => {
      jwtService.verifyAsync.mockRejectedValue(new Error('jwt expired'));

      await expect(authService.refresh({ refreshToken: 'expired-token' })).rejects.toMatchObject({
        code: 'INVALID_REFRESH_TOKEN',
      });
    });

    it('토큰은 유효하지만 회원이 존재하지 않으면 INVALID_REFRESH_TOKEN을 던진다', async () => {
      jwtService.verifyAsync.mockResolvedValue({ userid: 'deleted-user', name: 'x', api_key: null });
      userRepository.findOneBy.mockResolvedValue(null);

      await expect(authService.refresh({ refreshToken: 'valid-but-orphaned' })).rejects.toMatchObject({
        code: 'INVALID_REFRESH_TOKEN',
      });
    });
  });
});
