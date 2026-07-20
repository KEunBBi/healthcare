import { createContext, useContext } from 'react';
import type { User } from '../../../shared/types';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

export interface AuthContextValue {
  user: User | null;
  accessToken: string | null;
  status: AuthStatus;
  login: (id: string, passwd: string) => Promise<User>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useAuth는 AuthProvider 내부에서만 사용할 수 있다.');
  }
  return value;
}
