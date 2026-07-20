import type { LoginRequest, LoginResponseData, RefreshResponseData } from '../../../shared/types';
import { apiClient, request } from './client';

export function login(payload: LoginRequest): Promise<LoginResponseData> {
  return request(apiClient.post('/auth/login', payload));
}

/** 새로고침 등으로 앱이 다시 뜰 때, refreshToken 쿠키만으로 accessToken을 재발급받는다. */
export function bootstrapSession(): Promise<RefreshResponseData> {
  return request(apiClient.post('/auth/refresh'));
}
