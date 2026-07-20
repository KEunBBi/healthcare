import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Response } from 'express';
import { AppException } from '../exceptions/app.exception';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    if (host.getType() !== 'http') {
      throw exception;
    }

    const response = host.switchToHttp().getResponse<Response>();

    if (exception instanceof AppException) {
      response.status(exception.getStatus()).json({
        success: false,
        data: null,
        error: { code: exception.code, message: (exception.getResponse() as { message: string }).message },
      });
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      const rawMessage = typeof body === 'string' ? body : ((body as { message?: string | string[] }).message ?? exception.message);
      const message = Array.isArray(rawMessage) ? rawMessage.join(', ') : rawMessage;
      response.status(status).json({ success: false, data: null, error: { code: 'HTTP_ERROR', message } });
      return;
    }

    this.logger.error(exception instanceof Error ? exception.stack : exception);
    response
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ success: false, data: null, error: { code: 'INTERNAL_ERROR', message: '서버 오류가 발생했습니다.' } });
  }
}
