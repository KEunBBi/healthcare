import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { UserEntity } from '../entities';
import { AppException } from '../common/exceptions/app.exception';
import { toUserDto } from '../common/user-mapper';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './jwt-payload';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UserEntity) private readonly userRepository: Repository<UserEntity>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.userRepository.findOneBy({ userId: dto.id });
    if (!user) {
      throw AppException.invalidCredentials();
    }

    const matches = await bcrypt.compare(dto.passwd, user.password);
    if (!matches) {
      throw AppException.invalidCredentials();
    }

    const refreshToken = this.signRefreshToken(user);
    return {
      accessToken: this.signAccessToken(user),
      refreshToken,
      refreshTokenMaxAgeMs: this.getTokenMaxAgeMs(refreshToken),
      user: { ...toUserDto(user), apiKey: user.apiKey },
    };
  }

  async refresh(refreshToken: string) {
    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(refreshToken, {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw AppException.invalidRefreshToken();
    }

    const user = await this.userRepository.findOneBy({ userId: payload.userid });
    if (!user) {
      throw AppException.invalidRefreshToken();
    }

    return { accessToken: this.signAccessToken(user) };
  }

  /** 쿠키에 심을 RefreshToken의 만료시각(exp, 초 단위 UNIX)을 읽어 Set-Cookie maxAge(ms)로 환산한다. */
  private getTokenMaxAgeMs(token: string): number {
    const { exp } = this.jwtService.decode<JwtPayload & { exp: number }>(token);
    return exp * 1000 - Date.now();
  }

  private buildPayload(user: UserEntity): JwtPayload {
    return { userid: user.userId, name: user.name, api_key: user.apiKey };
  }

  private signAccessToken(user: UserEntity): string {
    return this.jwtService.sign(this.buildPayload(user), {
      secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
      expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRES_IN', '30m') as unknown as number,
    });
  }

  private signRefreshToken(user: UserEntity): string {
    return this.jwtService.sign(this.buildPayload(user), {
      secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '14d') as unknown as number,
    });
  }
}
