import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Repository } from 'typeorm';
import { UserEntity } from '../../entities';
import { toUserRole } from '../../common/user-role';
import { AuthenticatedUser } from '../authenticated-user';
import { JwtPayload } from '../jwt-payload';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    configService: ConfigService,
    @InjectRepository(UserEntity) private readonly userRepository: Repository<UserEntity>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const user = await this.userRepository.findOneBy({ userId: payload.userid });
    if (!user) {
      throw new UnauthorizedException('AccessToken이 만료되었거나 유효하지 않습니다.');
    }
    return { userId: user.userId, name: user.name, apiKey: user.apiKey, role: toUserRole(user.userType) };
  }
}
