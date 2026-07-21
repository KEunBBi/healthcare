import { useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import type { UserRole } from '../../../shared/types';
import { formatBirthDate, genderLabel, roleLabel } from '../../../shared/utils';
import { Avatar } from '../../src/components/Avatar/Avatar';
import { useAuth } from '../../src/auth/authContext';
import { useMembers } from '../../src/hooks/useMembers';
import { unstable_styles as styles } from './index.module.css';

const ROLE_OPTIONS: { label: string; value: UserRole | '' }[] = [
  { label: '전체', value: '' },
  { label: '의사', value: 'DOCTOR' },
  { label: '환자', value: 'PATIENT' },
];

export default function Home() {
  const { user } = useAuth();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | ''>('');
  const { members, loading, error } = useMembers(search, roleFilter);

  // REQUIREMENTS.md 2번: 환자는 목록을 거치지 않고 자신의 상세 화면으로 바로 이동한다.
  if (user?.role === 'PATIENT') {
    return <Redirect href={`/members/${user.userId}`} />;
  }

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.page}>
      <View style={styles.header}>
        <Text style={styles.title}>회원 목록</Text>
      </View>

      <View style={styles.filters}>
        <TextInput
          style={styles.searchInput}
          placeholder="회원 ID로 검색"
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <View style={styles.roleFilterRow}>
          {ROLE_OPTIONS.map((option) => (
            <Pressable
              key={option.value || 'all'}
              style={roleFilter === option.value ? [styles.roleChip, styles.roleChipActive] : styles.roleChip}
              onPress={() => setRoleFilter(option.value)}
            >
              <Text style={roleFilter === option.value ? [styles.roleChipText, styles.roleChipTextActive] : styles.roleChipText}>
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {loading && <Text style={styles.status}>불러오는 중...</Text>}
      {error && <Text style={styles.statusError}>{error}</Text>}
      {!loading && !error && members.length === 0 && <Text style={styles.status}>검색 결과가 없습니다.</Text>}

      <View style={styles.list}>
        {members.map((member) => (
          <Pressable key={member.userId} style={styles.row} onPress={() => router.push(`/members/${member.userId}`)}>
            <Avatar name={member.name} />
            <View style={styles.info}>
              <Text style={styles.name}>{member.name}</Text>
              <Text style={styles.meta}>
                {genderLabel(member.gender)} · {formatBirthDate(member.birthDate)}
              </Text>
            </View>
            <Text style={styles.roleBadge}>{roleLabel(member.role)}</Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}
