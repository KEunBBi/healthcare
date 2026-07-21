/**
 * Healthcare 프로젝트 공유 순수 로직.
 * backend·web·mobile이 공통으로 쓸 수 있는 함수만 둔다. health-web/docs/ARCHITECTURE.md 4장 참고.
 */

/**
 * 실시간 건강데이터 이벤트가 REST 최초 로드로 채운 커서보다 새로운지 판단한다
 * (health-web/docs/ARCHITECTURE.md 5.3, health-mobile 동일 패턴 적용 시 공용).
 * candidate가 cursor보다 이르거나 같으면 최초 로드와 중복이므로 false를 반환한다.
 */
export function isNewerThanCursor(candidateIso: string, cursorIso: string | null): boolean {
  if (cursorIso === null) {
    return true;
  }
  return new Date(candidateIso).getTime() > new Date(cursorIso).getTime();
}

// ── 회원 정보 표시 포맷터 (health-web·health-mobile 공용, docs/DATA_MODEL.md 1.1) ──

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
