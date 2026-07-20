import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AppException } from '../exceptions/app.exception';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser = unknown>(err: unknown, user: TUser, _info: unknown, _context: ExecutionContext): TUser {
    if (err || !user) {
      throw AppException.authFailed();
    }
    return user;
  }
}
