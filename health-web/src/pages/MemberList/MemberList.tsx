import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import type { UserRole } from '../../../../shared/types';
import { Avatar } from '../../components/Avatar/Avatar';
import { useAuth } from '../../auth/authContext';
import { useMembers } from '../../hooks/useMembers';
import { formatBirthDate, genderLabel, roleLabel } from '../../lib/format';
import styles from './MemberList.module.css';

export function MemberList() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | ''>('');
  const { members, loading, error } = useMembers(search, roleFilter);

  // REQUIREMENTS.md 2번: 환자는 목록을 거치지 않고 자신의 상세 화면으로 바로 이동한다.
  if (user?.role === 'PATIENT') {
    return <Navigate to={`/members/${user.userId}`} replace />;
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>회원 목록</h1>
      </header>

      <div className={styles.filters}>
        <input
          className={styles.searchInput}
          placeholder="회원 ID로 검색"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <select
          className={styles.roleSelect}
          value={roleFilter}
          onChange={(event) => setRoleFilter(event.target.value as UserRole | '')}
        >
          <option value="">전체</option>
          <option value="DOCTOR">의사</option>
          <option value="PATIENT">환자</option>
        </select>
      </div>

      {loading && <p className={styles.status}>불러오는 중...</p>}
      {error && <p className={styles.statusError}>{error}</p>}
      {!loading && !error && members.length === 0 && <p className={styles.status}>검색 결과가 없습니다.</p>}

      <ul className={styles.list}>
        {members.map((member) => (
          <li key={member.userId}>
            <button type="button" className={styles.row} onClick={() => navigate(`/members/${member.userId}`)}>
              <Avatar name={member.name} />
              <span className={styles.info}>
                <span className={styles.name}>{member.name}</span>
                <span className={styles.meta}>
                  {genderLabel(member.gender)} · {formatBirthDate(member.birthDate)}
                </span>
              </span>
              <span className={styles.roleBadge}>{roleLabel(member.role)}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
