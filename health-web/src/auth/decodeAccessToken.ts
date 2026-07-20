interface AccessTokenPayload {
  userid: string;
  name: string;
  api_key: string | null;
}

/**
 * AccessToken(JWT) payload를 브라우저에서 읽기만 한다 (서명 검증은 서버가 이미 수행했으므로 여기서는 하지 않는다).
 * 새로고침 직후 role 없이 accessToken만 갖고 있을 때, 본인 userId를 알아내 회원목록에서 role을 찾기 위해 쓴다.
 */
export function decodeAccessToken(token: string): AccessTokenPayload | null {
  try {
    const payloadSegment = token.split('.')[1];
    const base64 = payloadSegment.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64)) as AccessTokenPayload;
  } catch {
    return null;
  }
}
