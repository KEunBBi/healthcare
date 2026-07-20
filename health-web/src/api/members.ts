import type {
  HealthDataResponse,
  HealthDataType,
  MemberDetailResponseData,
  MembersListResponseData,
  UserRole,
} from '../../../shared/types';
import { apiClient, request } from './client';

export function getMembers(params?: { userId?: string; role?: UserRole }): Promise<MembersListResponseData> {
  return request(apiClient.get('/members', { params }));
}

export function getMemberDetail(userId: string): Promise<MemberDetailResponseData> {
  return request(apiClient.get(`/members/${userId}`));
}

export function getMemberHealthData<T extends HealthDataType>(
  userId: string,
  type: T,
  startAt: string,
  endAt: string,
): Promise<HealthDataResponse<T>> {
  return request(apiClient.get(`/members/${userId}/health-data`, { params: { type, startAt, endAt } }));
}
