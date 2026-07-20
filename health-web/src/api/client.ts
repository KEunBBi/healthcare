import axios from 'axios';
import type { AxiosError } from 'axios';
import type { ApiEnvelope, ApiErrorEnvelope } from '../../../shared/types';

export const apiClient = axios.create({
  baseURL: `${import.meta.env.VITE_API_BASE_URL}/api`,
  withCredentials: true,
});

let accessToken: string | null = null;
let onAuthExpired: (() => void) | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

/** AccessToken 재발급마저 실패했을 때 AuthContext가 구독해 로그인 상태를 정리하기 위한 콜백. */
export function setOnAuthExpired(callback: (() => void) | null): void {
  onAuthExpired = callback;
}

apiClient.interceptors.request.use((config) => {
  if (accessToken && !config.url?.startsWith('/auth/')) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

let refreshPromise: Promise<string> | null = null;

function refreshAccessTokenOnce(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = apiClient
      .post<ApiEnvelope<{ accessToken: string }>>('/auth/refresh')
      .then((response) => {
        if (!response.data.success) {
          throw new Error(response.data.error.message);
        }
        setAccessToken(response.data.data.accessToken);
        return response.data.data.accessToken;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

interface RetriableRequestConfig {
  url?: string;
  headers?: Record<string, string>;
  _retried?: boolean;
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetriableRequestConfig | undefined;
    const isAuthEndpoint = originalRequest?.url?.startsWith('/auth/');

    if (error.response?.status === 401 && originalRequest && !isAuthEndpoint && !originalRequest._retried) {
      try {
        const newToken = await refreshAccessTokenOnce();
        originalRequest._retried = true;
        return apiClient.request({ ...originalRequest, headers: { ...originalRequest.headers, Authorization: `Bearer ${newToken}` } });
      } catch {
        setAccessToken(null);
        onAuthExpired?.();
      }
    }
    return Promise.reject(error);
  },
);

export class ApiError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = 'ApiError';
  }
}

function isErrorEnvelope(data: unknown): data is ApiErrorEnvelope {
  return typeof data === 'object' && data !== null && (data as { success?: unknown }).success === false;
}

/** 공통 응답 포맷({success,data,error})을 벗겨 data만 반환하고, 실패 시 ApiError로 통일한다. */
export async function request<T>(promise: Promise<{ data: ApiEnvelope<T> }>): Promise<T> {
  try {
    const { data } = await promise;
    if (!data.success) {
      throw new ApiError(data.error.code, data.error.message);
    }
    return data.data;
  } catch (err) {
    if (err instanceof ApiError) {
      throw err;
    }
    if (axios.isAxiosError(err) && isErrorEnvelope(err.response?.data)) {
      const envelope = err.response!.data as ApiErrorEnvelope;
      throw new ApiError(envelope.error.code, envelope.error.message);
    }
    throw err;
  }
}
