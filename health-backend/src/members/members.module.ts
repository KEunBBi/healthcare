import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserBloodPressureEntity, UserBodyRecordEntity, UserDiseaseEntity, UserEntity, UserGlucoseEntity } from '../entities';
import { AuthModule } from '../auth/auth.module';
import { MembersController } from './members.controller';
import { MembersService } from './members.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserEntity,
      UserDiseaseEntity,
      UserBodyRecordEntity,
      UserBloodPressureEntity,
      UserGlucoseEntity,
    ]),
    AuthModule,
  ],
  controllers: [MembersController],
  providers: [MembersService],
})
export class MembersModule {}
