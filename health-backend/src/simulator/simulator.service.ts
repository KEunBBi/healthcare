import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { io, Socket } from 'socket.io-client';
import { Repository } from 'typeorm';
import {
  UserBloodPressureEntity,
  UserBodyRecordEntity,
  UserEntity,
  UserGlucoseEntity,
  UserHeartRateEntity,
  UserStepCountEntity,
} from '../entities';
import { HEALTH_EVENT } from '../common/health-event';
import type {
  BloodPressureEvent,
  GlucoseEvent,
  HeartRateEvent,
  SimulatorEnvelope,
  SimulatorErrorEvent,
  SleepEvent,
  StepCountEvent,
  WeightEvent,
} from './simulator-events';

const MAX_RECONNECT_ATTEMPTS = 3;
const RECONNECT_DELAY_MS = 2000;

@Injectable()
export class SimulatorService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SimulatorService.name);
  private readonly sockets = new Map<string, Socket>();
  private readonly reconnectAttempts = new Map<string, number>();
  private stopped = false;

  constructor(
    @InjectRepository(UserEntity) private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(UserHeartRateEntity) private readonly heartRateRepository: Repository<UserHeartRateEntity>,
    @InjectRepository(UserBloodPressureEntity)
    private readonly bloodPressureRepository: Repository<UserBloodPressureEntity>,
    @InjectRepository(UserBodyRecordEntity) private readonly bodyRecordRepository: Repository<UserBodyRecordEntity>,
    @InjectRepository(UserGlucoseEntity) private readonly glucoseRepository: Repository<UserGlucoseEntity>,
    @InjectRepository(UserStepCountEntity) private readonly stepCountRepository: Repository<UserStepCountEntity>,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /** 서버 시작 시 모든 "환자" 회원의 시뮬레이터 연결을 맺는다 (의사 계정은 자신의 건강데이터가 없으므로 제외). */
  async onModuleInit(): Promise<void> {
    const users = await this.userRepository.find();
    const baseUrl = this.configService.getOrThrow<string>('SIMULATOR_WS_URL');

    for (const user of users) {
      if (!user.apiKey || user.userType !== 'P') {
        continue;
      }
      this.connect(baseUrl, user.userId, user.apiKey);
    }
  }

  onModuleDestroy(): void {
    this.stopped = true;
    for (const socket of this.sockets.values()) {
      socket.close();
    }
    this.sockets.clear();
  }

  private connect(baseUrl: string, userId: string, apiKey: string): void {
    const socket = io(`${baseUrl}/simulator`, {
      transports: ['websocket'],
      query: { userId, apiKey },
      timeout: 5000,
      reconnection: false, // 재연결은 아래 scheduleReconnect()에서 최대 횟수를 직접 제어한다
    });
    this.sockets.set(userId, socket);

    socket.on('connect', () => {
      this.reconnectAttempts.set(userId, 0);
      this.logger.log(`시뮬레이터 연결 성공: ${userId}`);
    });

    socket.on('disconnect', (reason) => {
      this.logger.warn(`시뮬레이터 연결 끊김: ${userId} (${reason})`);
      if (this.stopped || reason === 'io server disconnect') {
        // 앱 종료 중이거나, 서버가 인증 실패 등으로 의도적으로 끊은 경우 — 재시도해도 동일하게 실패하므로 재연결하지 않는다
        return;
      }
      this.scheduleReconnect(baseUrl, userId, apiKey);
    });

    socket.on('error', (payload: SimulatorEnvelope<SimulatorErrorEvent>) =>
      this.logger.error(`시뮬레이터 인증 실패: ${userId} - ${payload.data.code} ${payload.data.message}`),
    );

    socket.on('heartRate', this.safeHandle(userId, 'heartRate', (data: HeartRateEvent) => this.handleHeartRate(data)));
    socket.on('stepCount', this.safeHandle(userId, 'stepCount', (data: StepCountEvent) => this.handleStepCount(data)));
    socket.on(
      'bloodPressure',
      this.safeHandle(userId, 'bloodPressure', (data: BloodPressureEvent) => this.handleBloodPressure(data)),
    );
    socket.on('weight', this.safeHandle(userId, 'weight', (data: WeightEvent) => this.handleWeight(data)));
    socket.on('glucose', this.safeHandle(userId, 'glucose', (data: GlucoseEvent) => this.handleGlucose(data)));
    socket.on(
      'sleep',
      this.safeHandle(userId, 'sleep', (data: SleepEvent) => this.emitHealthEvent(userId, 'sleep', data)),
    );
  }

  /** 연결이 끊기면 최대 MAX_RECONNECT_ATTEMPTS회까지만 재연결을 시도하고, 모두 실패하면 포기하고 로그를 남긴다. */
  private scheduleReconnect(baseUrl: string, userId: string, apiKey: string): void {
    const attempts = (this.reconnectAttempts.get(userId) ?? 0) + 1;
    this.reconnectAttempts.set(userId, attempts);

    if (attempts > MAX_RECONNECT_ATTEMPTS) {
      this.logger.error(`시뮬레이터 재연결 실패: ${userId} — ${MAX_RECONNECT_ATTEMPTS}회 재시도 후 재연결을 중단합니다.`);
      return;
    }

    this.logger.warn(`시뮬레이터 재연결 시도: ${userId} (${attempts}/${MAX_RECONNECT_ATTEMPTS})`);
    setTimeout(() => {
      if (!this.stopped) {
        this.connect(baseUrl, userId, apiKey);
      }
    }, RECONNECT_DELAY_MS);
  }

  /**
   * 시뮬레이터 이벤트는 `{event, data}`로 감싸여 온다 — data만 꺼내 넘기고, 처리 중 오류가 프로세스 전체를
   * 죽이지 않도록 격리한다. 수신 데이터는 로그로 남기되, 오늘(KST) 데이터가 아니면 로그를 생략한다.
   */
  private safeHandle<T extends { timestamp: string }>(
    userId: string,
    event: string,
    fn: (data: T) => Promise<void> | void,
  ): (payload: SimulatorEnvelope<T>) => void {
    return (payload) => {
      if (this.isToday(new Date(payload.data.timestamp))) {
        this.logger.log(`[${event}] ${userId} 수신: ${JSON.stringify(payload.data)}`);
      }
      Promise.resolve(fn(payload.data)).catch((error: Error) => {
        this.logger.error(`${event} 처리 실패 (${userId}): ${error.message}`);
      });
    };
  }

  private isToday(date: Date): boolean {
    const toKstDateString = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' });
    return toKstDateString(date) === toKstDateString(new Date());
  }

  private async handleHeartRate(payload: HeartRateEvent): Promise<void> {
    await this.heartRateRepository.save(
      this.heartRateRepository.create({
        userId: payload.userId,
        heartRate: payload.heartRate,
        status: payload.source === 'abnormal_event' ? payload.source : null,
        note: payload.note ?? null,
        measuredAt: new Date(payload.timestamp),
      }),
    );
    this.emitHealthEvent(payload.userId, 'heartRate', payload);
  }

  private async handleStepCount(payload: StepCountEvent): Promise<void> {
    await this.stepCountRepository.save(
      this.stepCountRepository.create({
        userId: payload.userId,
        stepCount: payload.stepCount,
        measuredAt: new Date(payload.timestamp),
      }),
    );
    this.emitHealthEvent(payload.userId, 'stepCount', payload);
  }

  private async handleBloodPressure(payload: BloodPressureEvent): Promise<void> {
    await this.bloodPressureRepository.save(
      this.bloodPressureRepository.create({
        userId: payload.userId,
        systolic: payload.systolic,
        diastolic: payload.diastolic,
        status: null,
        note: null,
        measuredAt: new Date(payload.timestamp),
      }),
    );
    this.emitHealthEvent(payload.userId, 'bloodPressure', payload);
  }

  private async handleWeight(payload: WeightEvent): Promise<void> {
    await this.bodyRecordRepository.save(
      this.bodyRecordRepository.create({
        userId: payload.userId,
        weightKg: payload.weightKg.toString(),
        bmi: payload.bmi.toString(),
        skeletalMuscleMassKg: payload.skeletalMuscleMassKg.toString(),
        bodyFatPercentage: payload.bodyFatPercentage.toString(),
        status: null,
        note: null,
        measuredAt: new Date(payload.timestamp),
      }),
    );
    this.emitHealthEvent(payload.userId, 'weight', payload);
  }

  private async handleGlucose(payload: GlucoseEvent): Promise<void> {
    await this.glucoseRepository.save(
      this.glucoseRepository.create({
        userId: payload.userId,
        glucoseMgDl: payload.glucoseMgDl,
        status: payload.status,
        note: null,
        measuredAt: new Date(payload.timestamp),
      }),
    );
    this.emitHealthEvent(payload.userId, 'glucose', payload);
  }

  private emitHealthEvent(userId: string, event: string, data: unknown): void {
    this.eventEmitter.emit(HEALTH_EVENT, { userId, event, data });
  }
}
