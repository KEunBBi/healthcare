import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from '../entities';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity]), PassportModule, JwtModule.register({})],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [JwtModule, PassportModule],
})
export class AuthModule {}
