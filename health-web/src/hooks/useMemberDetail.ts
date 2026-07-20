import { useEffect, useState } from 'react';
import type { MemberDetailResponseData } from '../../../shared/types';
import { ApiError } from '../api/client';
import { getMemberDetail } from '../api/members';

interface UseMemberDetailResult {
  data: MemberDetailResponseData | null;
  loading: boolean;
  error: ApiError | null;
}

export function useMemberDetail(userId: string): UseMemberDetailResult {
  const [data, setData] = useState<MemberDetailResponseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      setData(null);
      try {
        const result = await getMemberDetail(userId);
        if (!cancelled) setData(result);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err : new ApiError('UNKNOWN', '회원 상세 정보를 불러오지 못했습니다.'));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return { data, loading, error };
}
