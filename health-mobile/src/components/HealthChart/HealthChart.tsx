import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { SeriesPoint } from '../../hooks/useRealtimeHealthData';
import styles from './HealthChart.module.css';

interface HealthChartProps {
  title: string;
  unit: string;
  data: SeriesPoint[];
  color: string;
}

// recharts는 순수 SVG/DOM 라이브러리라 RN 컴포넌트(View/Text) 대신 일반 웹 엘리먼트로 작성한다
// (ARCHITECTURE.md 1장 차트 항목 참고 — Web 타겟에서만 쓰이며 className(default export)을 사용한다).
export function HealthChart({ title, unit, data, color }: HealthChartProps) {
  const chartData = data.map((point) => ({
    time: new Date(point.measuredAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }),
    value: point.value,
  }));

  return (
    <div className={styles.card}>
      <h3 className={styles.title}>
        {title} <span className={styles.unit}>({unit})</span>
      </h3>
      {data.length === 0 ? (
        <p className={styles.empty}>표시할 데이터가 없습니다.</p>
      ) : (
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
            <XAxis dataKey="time" tick={{ fontSize: 12 }} minTickGap={24} />
            <YAxis tick={{ fontSize: 12 }} width={36} domain={['auto', 'auto']} />
            <Tooltip formatter={(value) => [`${value} ${unit}`, title]} />
            <Line type="monotone" dataKey="value" stroke={color} dot={false} strokeWidth={2} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
