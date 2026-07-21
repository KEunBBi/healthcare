import { Pressable, ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { formatBirthDate, genderLabel } from '../../../../shared/utils';
import { Avatar } from '../../../src/components/Avatar/Avatar';
import { ChatPanel } from '../../../src/components/ChatPanel/ChatPanel';
import { HealthChart } from '../../../src/components/HealthChart/HealthChart';
import { useAuth } from '../../../src/auth/authContext';
import { useMemberDetail } from '../../../src/hooks/useMemberDetail';
import { useRealtimeHealthData } from '../../../src/hooks/useRealtimeHealthData';
import { unstable_styles as styles } from './[userId].module.css';

// 회원 상세 화면(VIEW) — 실시간 그래프(심박·혈당·걸음수) + 챗봇(CHAT).
// ARCHITECTURE.md 5.3: "REST 최초 로드 → WebSocket 구독 전환" 2단계 패턴, expo-router 클라이언트 사이드
// 라우팅으로 화면이 마운트되어 있는 동안만 소켓 연결을 유지한다(SPA).
export default function MemberDetail() {
  const { userId = '' } = useLocalSearchParams<{ userId: string }>();
  const { user, accessToken } = useAuth();
  const router = useRouter();
  const { data, loading, error } = useMemberDetail(userId);

  const seed = data
    ? { glucose: data.recentGlucoses, bloodPressure: data.recentBloodPressures, weight: data.recentWeights }
    : null;
  const realtime = useRealtimeHealthData(userId, accessToken, user?.role === 'DOCTOR', seed);

  if (loading) {
    return (
      <View style={styles.page}>
        <Text style={styles.status}>불러오는 중...</Text>
      </View>
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
      <View style={styles.page}>
        <Text style={styles.statusError}>{message}</Text>
      </View>
    );
  }

  if (!data) {
    return null;
  }

  const { member } = data;

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.page}>
      {user?.role === 'DOCTOR' && (
        <Pressable style={styles.back} onPress={() => router.back()}>
          <Text style={styles.backText}>← 목록으로</Text>
        </Pressable>
      )}

      <View style={styles.header}>
        <Avatar name={member.name} size={56} />
        <View style={styles.identity}>
          <Text style={styles.name}>{member.name}</Text>
          <Text style={styles.meta}>
            {genderLabel(member.gender)} · {formatBirthDate(member.birthDate)} · {member.userId}
          </Text>
        </View>
        <Text style={realtime.connected ? [styles.connectionBadge, styles.connectionBadgeConnected] : styles.connectionBadge}>
          {realtime.connected ? '실시간 연결됨' : '연결 대기 중'}
        </Text>
      </View>

      {member.diseases.length > 0 && (
        <View style={styles.diseases}>
          {member.diseases.map((disease) => (
            <Text key={disease.diseaseCode} style={styles.diseaseBadge}>
              {disease.nameKr}
            </Text>
          ))}
        </View>
      )}

      {member.memo && <Text style={styles.memo}>{member.memo}</Text>}

      <View style={styles.charts}>
        <HealthChart title="심박수" unit="bpm" data={realtime.heartRate} color="#d92d20" />
        <HealthChart title="혈당" unit="mg/dL" data={realtime.glucose} color="#0066cc" />
        <HealthChart title="걸음수" unit="보" data={realtime.stepCount} color="#1a8754" />
      </View>

      <View style={styles.recent}>
        <View style={styles.recentCard}>
          <Text style={styles.recentLabel}>최근 혈압</Text>
          <Text style={styles.recentValue}>
            {realtime.latestBloodPressure
              ? `${realtime.latestBloodPressure.systolic}/${realtime.latestBloodPressure.diastolic} mmHg`
              : '데이터 없음'}
          </Text>
        </View>
        <View style={styles.recentCard}>
          <Text style={styles.recentLabel}>최근 체중</Text>
          <Text style={styles.recentValue}>
            {realtime.latestWeight ? `${realtime.latestWeight.weightKg}kg (BMI ${realtime.latestWeight.bmi})` : '데이터 없음'}
          </Text>
        </View>
      </View>

      <ChatPanel />
    </ScrollView>
  );
}
