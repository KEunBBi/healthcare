import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedUser } from '../../auth/authenticated-user';

export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): AuthenticatedUser => {
  return ctx.switchToHttp().getRequest().user;
});
