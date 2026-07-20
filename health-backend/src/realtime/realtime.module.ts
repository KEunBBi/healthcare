import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from '../entities';
import { AuthModule } from '../auth/auth.module';
import { RealtimeGateway } from './realtime.gateway';

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity]), AuthModule],
  providers: [RealtimeGateway],
})
export class RealtimeModule {}
