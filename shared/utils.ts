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
