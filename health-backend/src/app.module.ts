import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AlertModule } from './alert/alert.module';
import { AuthModule } from './auth/auth.module';
import { ChatModule } from './chat/chat.module';
import {
  DiseaseCodeEntity,
  UserBloodPressureEntity,
  UserBodyRecordEntity,
  UserDiseaseEntity,
  UserEntity,
  UserGlucoseEntity,
  UserHeartRateEntity,
  UserStepCountEntity,
} from './entities';
import { MembersModule } from './members/members.module';
import { RealtimeModule } from './realtime/realtime.module';
import { SimulatorModule } from './simulator/simulator.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.getOrThrow<string>('DATABASE_HOST'),
        port: configService.get<number>('DATABASE_PORT', 5432),
        database: configService.getOrThrow<string>('DATABASE_NAME'),
        username: configService.getOrThrow<string>('DATABASE_USER'),
        password: configService.getOrThrow<string>('DATABASE_PASSWORD'),
        entities: [
          UserEntity,
          DiseaseCodeEntity,
          UserDiseaseEntity,
          UserHeartRateEntity,
          UserBloodPressureEntity,
          UserBodyRecordEntity,
          UserGlucoseEntity,
          UserStepCountEntity,
        ],
        synchronize: false,
      }),
    }),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    AuthModule,
    MembersModule,
    SimulatorModule,
    RealtimeModule,
    ChatModule,
    AlertModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
