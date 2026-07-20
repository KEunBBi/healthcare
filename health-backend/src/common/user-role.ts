export type UserRole = 'DOCTOR' | 'PATIENT';

export function toUserRole(userType: string): UserRole {
  return userType === 'D' ? 'DOCTOR' : 'PATIENT';
}

export function toUserType(role: UserRole): string {
  return role === 'DOCTOR' ? 'D' : 'P';
}
