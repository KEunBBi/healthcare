/** 시뮬레이터는 모든 이벤트를 `{event, data}`로 감싸서 보낸다 (SIMULATOR_API_SPEC.md 0장). */
export interface SimulatorEnvelope<T> {
  event: string;
  data: T;
}

export interface HeartRateEvent {
  timestamp: string;
  userId: string;
  heartRate: number;
  source: 'simulation' | 'abnormal_event';
  note?: string;
}

export interface StepCountEvent {
  timestamp: string;
  userId: string;
  stepCount: number;
  dailyReset: boolean;
}

export interface BloodPressureEvent {
  timestamp: string;
  userId: string;
  systolic: number;
  diastolic: number;
  source: string;
}

export interface WeightEvent {
  timestamp: string;
  userId: string;
  weightKg: number;
  bmi: number;
  skeletalMuscleMassKg: number;
  bodyFatPercentage: number;
  source: string;
}

export interface GlucoseEvent {
  timestamp: string;
  userId: string;
  glucoseMgDl: number;
  status: 'normal' | 'elevated' | 'high';
  source: string;
}

export interface SleepEvent {
  timestamp: string;
  userId: string;
  sleepHours: number;
  quality: 'good' | 'fair' | 'poor';
  bedTime: string;
  wakeTime: string;
  source: string;
}

export interface SimulatorErrorEvent {
  code: string;
  message: string;
}
