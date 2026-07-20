import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface SuccessResponse {
  success: true;
  data: unknown;
  error: null;
}

@Injectable()
export class ResponseInterceptor implements NestInterceptor<unknown, SuccessResponse | unknown> {
  intercept(context: ExecutionContext, next: CallHandler<unknown>): Observable<SuccessResponse | unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }
    return next.handle().pipe(map((data) => ({ success: true, data: data ?? null, error: null })));
  }
}
