import {
  UserBloodPressureEntity,
  UserBodyRecordEntity,
  UserGlucoseEntity,
  UserHeartRateEntity,
  UserStepCountEntity,
} from '../entities';

export const HEALTH_DATA_TYPES = ['heartRate', 'bloodPressure', 'weight', 'glucose', 'stepCount'] as const;
export type HealthDataType = (typeof HEALTH_DATA_TYPES)[number];

export const HEALTH_DATA_ENTITIES = {
  heartRate: UserHeartRateEntity,
  bloodPressure: UserBloodPressureEntity,
  weight: UserBodyRecordEntity,
  glucose: UserGlucoseEntity,
  stepCount: UserStepCountEntity,
} as const;
