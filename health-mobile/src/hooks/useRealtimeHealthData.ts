import { useEffect, useRef, useState } from 'react';
import type {
  BloodPressureEventData,
  BloodPressureRecord,
  GlucoseEventData,
  GlucoseRecord,
  HeartRateEventData,
  StepCountEventData,
  WeightEventData,
  WeightRecord,
} from '../../../shared/types';
import { isNewerThanCursor } from '../../../shared/utils';
import { getMemberHealthData } from '../api/members';
import { createRealtimeSocket } from '../ws/realtimeSocket';

export interface SeriesPoint {
  measuredAt: string;
  value: number;
}

export interface RealtimeSeed {
  glucose: GlucoseRecord[];
  bloodPressure: BloodPressureRecord[];
  weight: WeightRecord[];
}

interface UseRealtimeHealthDataResult {
  heartRate: SeriesPoint[];
  glucose: SeriesPoint[];
  stepCount: SeriesPoint[];
  latestBloodPressure: { measuredAt: string; systolic: number; diastolic: number } | null;
  latestWeight: { measuredAt: string; weightKg: number; bmi: number } | null;
  connected: boolean;
}

type Cursors = Record<'heartRate' | 'glucose' | 'stepCount' | 'bloodPressure' | 'weight', string | null>;

const INITIAL_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * 회원 상세 화면의 심박·혈당·걸음수(및 혈압·체중) 실시간 처리를 담당한다.
 * ARCHITECTURE.md 5.3의 "REST 최초 로드 → WebSocket 구독 전환" 2단계 패턴을 그대로 구현한다(health-web과 동일 로직).
 */
export function useRealtimeHealthData(
  userId: string,
  accessToken: string | null,
  isDoctor: boolean,
  seed: RealtimeSeed | null,
): UseRealtimeHealthDataResult {
  const [heartRate, setHeartRate] = useState<SeriesPoint[]>([]);
  const [glucose, setGlucose] = useState<SeriesPoint[]>([]);
  const [stepCount, setStepCount] = useState<SeriesPoint[]>([]);
  const [latestBloodPressure, setLatestBloodPressure] = useState<{ measuredAt: string; systolic: number; diastolic: number } | null>(null);
  const [latestWeight, setLatestWeight] = useState<{ measuredAt: string; weightKg: number; bmi: number } | null>(null);
  const [connected, setConnected] = useState(false);

  const cursors = useRef<Cursors>({ heartRate: null, glucose: null, stepCount: null, bloodPressure: null, weight: null });
  const seededRef = useRef(false);

  // ① REST 최초 로드: 회원상세(1.4)에 없는 심박·걸음수는 건강데이터 조회(1.5)로 별도 로드한다.
  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;

    async function loadInitial() {
      const endAt = new Date().toISOString();
      const startAt = new Date(Date.now() - INITIAL_WINDOW_MS).toISOString();

      const [heartRateRes, stepCountRes] = await Promise.all([
        getMemberHealthData(userId, 'heartRate', startAt, endAt),
        getMemberHealthData(userId, 'stepCount', startAt, endAt),
      ]);
      if (cancelled) return;

      setHeartRate(heartRateRes.records.map((r) => ({ measuredAt: r.measuredAt, value: r.heartRate })));
      setStepCount(stepCountRes.records.map((r) => ({ measuredAt: r.measuredAt, value: r.stepCount })));
      cursors.current.heartRate = lastMeasuredAt(heartRateRes.records);
      cursors.current.stepCount = lastMeasuredAt(stepCountRes.records);
    }

    loadInitial();
    return () => {
      cancelled = true;
    };
  }, [userId, accessToken]);

  // ① 회원상세(1.4)가 이미 갖고 있는 혈당/혈압/체중 최근 7일치를 커서와 함께 시드한다 (1회만).
  // recentGlucoses 등은 측정일시 내림차순(API_SPEC.md 1.4)이므로, 그래프용으로는 오름차순으로 뒤집는다.
  useEffect(() => {
    if (!seed || seededRef.current) return;
    seededRef.current = true;

    const glucoseAscending = [...seed.glucose].reverse();
    setGlucose(glucoseAscending.map((r) => ({ measuredAt: r.measuredAt, value: r.glucoseMgDl })));
    cursors.current.glucose = lastMeasuredAt(glucoseAscending);

    const latestBp = seed.bloodPressure[0] ?? null;
    setLatestBloodPressure(latestBp);
    cursors.current.bloodPressure = latestBp?.measuredAt ?? null;

    const latestW = seed.weight[0] ?? null;
    setLatestWeight(latestW);
    cursors.current.weight = latestW?.measuredAt ?? null;
  }, [seed]);

  // ② WebSocket 구독 전환
  useEffect(() => {
    if (!accessToken) return;

    const socket = createRealtimeSocket(accessToken);

    socket.on('connect', () => {
      setConnected(true);
      if (isDoctor) {
        socket.emit('subscribe', { userId });
      }
    });
    socket.on('disconnect', () => setConnected(false));

    socket.on('heartRate', ({ data }: { data: HeartRateEventData }) => {
      if (data.userId !== userId || !isNewerThanCursor(data.timestamp, cursors.current.heartRate)) return;
      cursors.current.heartRate = data.timestamp;
      setHeartRate((prev) => [...prev, { measuredAt: data.timestamp, value: data.heartRate }]);
    });

    socket.on('stepCount', ({ data }: { data: StepCountEventData }) => {
      if (data.userId !== userId || !isNewerThanCursor(data.timestamp, cursors.current.stepCount)) return;
      cursors.current.stepCount = data.timestamp;
      setStepCount((prev) => [...prev, { measuredAt: data.timestamp, value: data.stepCount }]);
    });

    socket.on('glucose', ({ data }: { data: GlucoseEventData }) => {
      if (data.userId !== userId || !isNewerThanCursor(data.timestamp, cursors.current.glucose)) return;
      cursors.current.glucose = data.timestamp;
      setGlucose((prev) => [...prev, { measuredAt: data.timestamp, value: data.glucoseMgDl }]);
    });

    socket.on('bloodPressure', ({ data }: { data: BloodPressureEventData }) => {
      if (data.userId !== userId || !isNewerThanCursor(data.timestamp, cursors.current.bloodPressure)) return;
      cursors.current.bloodPressure = data.timestamp;
      setLatestBloodPressure({ measuredAt: data.timestamp, systolic: data.systolic, diastolic: data.diastolic });
    });

    socket.on('weight', ({ data }: { data: WeightEventData }) => {
      if (data.userId !== userId || !isNewerThanCursor(data.timestamp, cursors.current.weight)) return;
      cursors.current.weight = data.timestamp;
      setLatestWeight({ measuredAt: data.timestamp, weightKg: data.weightKg, bmi: data.bmi });
    });

    return () => {
      if (isDoctor) {
        socket.emit('unsubscribe', { userId });
      }
      socket.disconnect();
    };
  }, [userId, accessToken, isDoctor]);

  return { heartRate, glucose, stepCount, latestBloodPressure, latestWeight, connected };
}

function lastMeasuredAt(records: { measuredAt: string }[]): string | null {
  return records.length > 0 ? records[records.length - 1].measuredAt : null;
}
