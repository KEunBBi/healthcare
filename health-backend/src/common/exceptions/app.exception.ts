import { HttpException, HttpStatus } from '@nestjs/common';

export class AppException extends HttpException {
  constructor(
    public readonly code: string,
    status: HttpStatus,
    message: string,
  ) {
    super({ code, message }, status);
  }

  static invalidCredentials() {
    return new AppException('INVALID_CREDENTIALS', HttpStatus.UNAUTHORIZED, '아이디 또는 비밀번호가 올바르지 않습니다.');
  }

  static invalidRefreshToken() {
    return new AppException('INVALID_REFRESH_TOKEN', HttpStatus.UNAUTHORIZED, 'RefreshToken이 만료되었거나 유효하지 않습니다.');
  }

  static authFailed(message = 'AccessToken이 만료되었거나 유효하지 않습니다.') {
    return new AppException('AUTH_FAILED', HttpStatus.UNAUTHORIZED, message);
  }

  static forbidden(message = '해당 회원의 데이터에 접근할 권한이 없습니다.') {
    return new AppException('FORBIDDEN', HttpStatus.FORBIDDEN, message);
  }

  static memberNotFound(userId: string) {
    return new AppException('MEMBER_NOT_FOUND', HttpStatus.NOT_FOUND, `회원(${userId})을 찾을 수 없습니다.`);
  }

  static invalidDateRange() {
    return new AppException('INVALID_DATE_RANGE', HttpStatus.BAD_REQUEST, 'startAt은 endAt보다 이전이어야 합니다.');
  }

  static aiAgentUnavailable() {
    return new AppException('AI_AGENT_UNAVAILABLE', HttpStatus.BAD_GATEWAY, 'AI Agent 서버 호출에 실패했습니다.');
  }
}
