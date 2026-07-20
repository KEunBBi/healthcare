/** health-web 화면 표시 전용 포맷터. 다른 프로젝트와 공유하지 않으므로 shared/utils.ts에 두지 않는다. */

export function formatBirthDate(birthDate: string): string {
  if (birthDate.length !== 8) return birthDate;
  return `${birthDate.slice(0, 4)}-${birthDate.slice(4, 6)}-${birthDate.slice(6, 8)}`;
}

export function genderLabel(gender: string): string {
  if (gender === 'M') return '남성';
  if (gender === 'F') return '여성';
  return gender;
}

export function roleLabel(role: 'DOCTOR' | 'PATIENT'): string {
  return role === 'DOCTOR' ? '의사' : '환자';
}
