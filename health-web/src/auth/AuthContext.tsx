import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { User } from '../../../shared/types';
import { bootstrapSession, login as loginRequest } from '../api/auth';
import { setAccessToken, setOnAuthExpired } from '../api/client';
import { getMembers } from '../api/members';
import { AuthContext } from './authContext';
import type { AuthStatus } from './authContext';
import { decodeAccessToken } from './decodeAccessToken';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');

  function clearSession() {
    setAccessToken(null);
    setToken(null);
    setUser(null);
    setStatus('unauthenticated');
  }

  useEffect(() => {
    setOnAuthExpired(clearSession);
    return () => setOnAuthExpired(null);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      try {
        const { accessToken } = await bootstrapSession();
        const decoded = decodeAccessToken(accessToken);
        if (!decoded) {
          throw new Error('invalid access token');
        }
        const { members } = await getMembers();
        const me = members.find((member) => member.userId === decoded.userid) ?? null;
        if (cancelled) return;
        if (!me) {
          clearSession();
          return;
        }
        setAccessToken(accessToken);
        setToken(accessToken);
        setUser(me);
        setStatus('authenticated');
      } catch {
        if (!cancelled) {
          setStatus('unauthenticated');
        }
      }
    }

    restoreSession();
    return () => {
      cancelled = true;
    };
  }, []);

  async function login(id: string, passwd: string): Promise<User> {
    const data = await loginRequest({ id, passwd });
    setAccessToken(data.accessToken);
    setToken(data.accessToken);
    setUser(data.user);
    setStatus('authenticated');
    return data.user;
  }

  function logout() {
    // API_SPEC.md에는 로그아웃(쿠키 무효화) 엔드포인트가 없어 클라이언트 상태만 정리한다.
    // refreshToken 쿠키 자체는 만료 전까지 남아있을 수 있다.
    clearSession();
  }

  return (
    <AuthContext.Provider value={{ user, accessToken: token, status, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
