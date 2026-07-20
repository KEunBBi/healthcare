import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  UserBloodPressureEntity,
  UserBodyRecordEntity,
  UserEntity,
  UserGlucoseEntity,
  UserHeartRateEntity,
  UserStepCountEntity,
} from '../entities';
import { RetentionService } from './retention.service';
import { SimulatorService } from './simulator.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserEntity,
      UserHeartRateEntity,
      UserBloodPressureEntity,
      UserBodyRecordEntity,
      UserGlucoseEntity,
      UserStepCountEntity,
    ]),
  ],
  providers: [SimulatorService, RetentionService],
})
export class SimulatorModule {}
