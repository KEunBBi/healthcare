/**
 * Healthcare 프로젝트 공유 타입.
 * health-backend가 제공하는 API 계약(health-backend/docs/API_SPEC.md)과
 * 데이터 모델(docs/DATA_MODEL.md)을 그대로 반영한다. backend·web·mobile이 함께 참조하며,
 * 각 프로젝트에서 동일한 타입을 다시 선언하지 않는다.
 */

// ── 공통 응답 포맷 (API_SPEC.md 0장) ─────────────────────────────

export interface ApiSuccessEnvelope<T> {
  success: true;
  data: T;
  error: null;
}

export interface ApiErrorEnvelope {
  success: false;
  data: null;
  error: { code: string; message: string };
}

export type ApiEnvelope<T> = ApiSuccessEnvelope<T> | ApiErrorEnvelope;

// ── 회원 (API_SPEC.md 1.1~1.4, docs/DATA_MODEL.md 1.1) ─────────────

export type UserRole = 'DOCTOR' | 'PATIENT';

export interface User {
  userId: string;
  name: string;
  gender: string;
  birthDate: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

/** 로그인 응답(1.1)에만 포함되는 apiKey 포함 회원정보. */
export interface UserWithApiKey extends User {
  apiKey: string;
}

export interface Disease {
  diseaseCode: string;
  nameKr: string;
  diagnosedAt: string;
}

export interface MemberDetail extends User {
  diseases: Disease[];
  memo: string | null;
}

// ── 인증 (API_SPEC.md 1.1, 1.2) ─────────────────────────────────
// RefreshToken은 응답 바디에 없다 — HttpOnly 쿠키로 내려간다 (API_SPEC.md 1.1 추가 조건).

export interface LoginRequest {
  id: string;
  passwd: string;
}

export interface LoginResponseData {
  accessToken: string;
  user: UserWithApiKey;
}

export interface RefreshResponseData {
  accessToken: string;
}

// ── 건강데이터 시계열 (docs/DATA_MODEL.md 1.4~1.8) ───────────────────

export interface HeartRateRecord {
  userId: string;
  heartRate: number;
  status: string | null;
  note: string | null;
  measuredAt: string;
  createdAt: string;
}

export interface BloodPressureRecord {
  measuredAt: string;
  systolic: number;
  diastolic: number;
  status: string | null;
}

export interface WeightRecord {
  measuredAt: string;
  weightKg: number;
  bmi: number;
}

export interface GlucoseRecord {
  measuredAt: string;
  glucoseMgDl: number;
  status: 'normal' | 'elevated' | 'high';
}

export interface StepCountRecord {
  userId: string;
  stepCount: number;
  measuredAt: string;
  createdAt: string;
}

export type HealthDataType = 'heartRate' | 'bloodPressure' | 'weight' | 'glucose' | 'stepCount';

export interface HealthDataRecordByType {
  heartRate: HeartRateRecord;
  bloodPressure: BloodPressureRecord;
  weight: WeightRecord;
  glucose: GlucoseRecord;
  stepCount: StepCountRecord;
}

export interface HealthDataResponse<T extends HealthDataType = HealthDataType> {
  type: T;
  records: HealthDataRecordByType[T][];
}

// ── 회원 목록/상세 조회 응답 (API_SPEC.md 1.3, 1.4) ───────────────────

export interface MembersListResponseData {
  members: User[];
}

export interface MemberDetailResponseData {
  member: MemberDetail;
  recentWeights: WeightRecord[];
  recentBloodPressures: BloodPressureRecord[];
  recentGlucoses: GlucoseRecord[];
}

// ── 챗봇 (API_SPEC.md 1.6) ───────────────────────────────────────

export interface ChatRequest {
  message: string;
}

export interface ChatResponseData {
  answer: string;
}

// ── 실시간 WebSocket 이벤트 (API_SPEC.md 2.3, docs/DATA_MODEL.md 2.2~2.7) ──
// health-backend의 RealtimeGateway가 시뮬레이터로부터 수신 즉시 중계하는 이벤트.
// 페이로드는 { event, data } 형태이며 필드는 시뮬레이터 원본 그대로다.

export interface HeartRateEventData {
  timestamp: string;
  userId: string;
  heartRate: number;
  source: 'simulation' | 'abnormal_event';
  note?: string;
}

export interface StepCountEventData {
  timestamp: string;
  userId: string;
  stepCount: number;
  dailyReset: boolean;
}

export interface BloodPressureEventData {
  timestamp: string;
  userId: string;
  systolic: number;
  diastolic: number;
  source: string;
}

export interface WeightEventData {
  timestamp: string;
  userId: string;
  weightKg: number;
  bmi: number;
  skeletalMuscleMassKg: number;
  bodyFatPercentage: number;
  source: string;
}

export interface GlucoseEventData {
  timestamp: string;
  userId: string;
  glucoseMgDl: number;
  status: 'normal' | 'elevated' | 'high';
  source: string;
}

export interface RealtimeEventDataMap {
  heartRate: HeartRateEventData;
  stepCount: StepCountEventData;
  bloodPressure: BloodPressureEventData;
  weight: WeightEventData;
  glucose: GlucoseEventData;
}

export type RealtimeEventName = keyof RealtimeEventDataMap;

export interface RealtimeEventMessage<K extends RealtimeEventName = RealtimeEventName> {
  event: K;
  data: RealtimeEventDataMap[K];
}

// ── 에러 코드 (API_SPEC.md 3장) ───────────────────────────────────

export type ApiErrorCode =
  | 'INVALID_CREDENTIALS'
  | 'INVALID_REFRESH_TOKEN'
  | 'AUTH_FAILED'
  | 'FORBIDDEN'
  | 'MEMBER_NOT_FOUND'
  | 'INVALID_DATE_RANGE'
  | 'AI_AGENT_UNAVAILABLE';
