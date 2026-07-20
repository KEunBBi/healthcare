import { useParams } from 'react-router-dom';
import { Avatar } from '../../components/Avatar/Avatar';
import { ChatPanel } from '../../components/ChatPanel/ChatPanel';
import { HealthChart } from '../../components/HealthChart/HealthChart';
import { useAuth } from '../../auth/authContext';
import { useMemberDetail } from '../../hooks/useMemberDetail';
import { useRealtimeHealthData } from '../../hooks/useRealtimeHealthData';
import { formatBirthDate, genderLabel } from '../../lib/format';
import styles from './MemberDetail.module.css';

export function MemberDetail() {
  const { userId = '' } = useParams<{ userId: string }>();
  const { user, accessToken } = useAuth();
  const { data, loading, error } = useMemberDetail(userId);

  const seed = data
    ? { glucose: data.recentGlucoses, bloodPressure: data.recentBloodPressures, weight: data.recentWeights }
    : null;
  const realtime = useRealtimeHealthData(userId, accessToken, user?.role === 'DOCTOR', seed);

  if (loading) {
    return (
      <div className={styles.page}>
        <p className={styles.status}>불러오는 중...</p>
      </div>
    );
  }

  if (error) {
    const message =
      error.code === 'FORBIDDEN'
        ? '이 회원의 정보를 조회할 권한이 없습니다.'
        : error.code === 'MEMBER_NOT_FOUND'
          ? '존재하지 않는 회원입니다.'
          : error.message;
    return (
      <div className={styles.page}>
        <p className={styles.statusError}>{message}</p>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const { member } = data;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Avatar name={member.name} size={56} />
        <div className={styles.identity}>
          <h1 className={styles.name}>{member.name}</h1>
          <p className={styles.meta}>
            {genderLabel(member.gender)} · {formatBirthDate(member.birthDate)} · {member.userId}
          </p>
        </div>
        <span className={styles.connectionBadge} data-connected={realtime.connected}>
          {realtime.connected ? '실시간 연결됨' : '연결 대기 중'}
        </span>
      </header>

      {member.diseases.length > 0 && (
        <section className={styles.diseases}>
          {member.diseases.map((disease) => (
            <span key={disease.diseaseCode} className={styles.diseaseBadge}>
              {disease.nameKr}
            </span>
          ))}
        </section>
      )}

      {member.memo && <p className={styles.memo}>{member.memo}</p>}

      <section className={styles.charts}>
        <HealthChart title="심박수" unit="bpm" data={realtime.heartRate} color="#d92d20" />
        <HealthChart title="혈당" unit="mg/dL" data={realtime.glucose} color="#0066cc" />
        <HealthChart title="걸음수" unit="보" data={realtime.stepCount} color="#1a8754" />
      </section>

      <section className={styles.recent}>
        <div className={styles.recentCard}>
          <span className={styles.recentLabel}>최근 혈압</span>
          <span className={styles.recentValue}>
            {realtime.latestBloodPressure
              ? `${realtime.latestBloodPressure.systolic}/${realtime.latestBloodPressure.diastolic} mmHg`
              : '데이터 없음'}
          </span>
        </div>
        <div className={styles.recentCard}>
          <span className={styles.recentLabel}>최근 체중</span>
          <span className={styles.recentValue}>
            {realtime.latestWeight ? `${realtime.latestWeight.weightKg}kg (BMI ${realtime.latestWeight.bmi})` : '데이터 없음'}
          </span>
        </div>
      </section>

      <ChatPanel />
    </div>
  );
}
