import { useEffect, useState } from 'react';
import type { User, UserRole } from '../../../shared/types';
import { ApiError } from '../api/client';
import { getMembers } from '../api/members';

interface UseMembersResult {
  members: User[];
  loading: boolean;
  error: string | null;
}

/** 검색어(userId 부분일치) 입력 중 매 타이핑마다 요청하지 않도록 300ms 디바운스한다. */
export function useMembers(searchUserId: string, roleFilter: UserRole | ''): UseMembersResult {
  const [members, setMembers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      setLoading(true);
      setError(null);
      getMembers({ userId: searchUserId || undefined, role: roleFilter || undefined })
        .then((data) => {
          if (!cancelled) setMembers(data.members);
        })
        .catch((err: unknown) => {
          if (cancelled) return;
          setError(err instanceof ApiError ? err.message : '회원 목록을 불러오지 못했습니다.');
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [searchUserId, roleFilter]);

  return { members, loading, error };
}
