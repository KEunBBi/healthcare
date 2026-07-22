import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppException } from '../common/exceptions/app.exception';
import { ChatHistoryTurnDto } from './dto/chat-message.dto';

const REQUEST_TIMEOUT_MS = 10_000;

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(private readonly configService: ConfigService) {}

  async ask(message: string, history?: ChatHistoryTurnDto[]): Promise<string> {
    const baseUrl = this.configService.getOrThrow<string>('AI_AGENT_BASE_URL');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(`${baseUrl}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, history }),
        signal: controller.signal,
      });

      if (!response.ok) {
        this.logger.error(`health-ai 호출 실패: ${response.status} ${await response.text()}`);
        throw AppException.aiAgentUnavailable();
      }

      const body = (await response.json()) as { answer?: string };
      if (!body.answer) {
        throw AppException.aiAgentUnavailable();
      }
      return body.answer;
    } catch (error) {
      if (error instanceof AppException) {
        throw error;
      }
      this.logger.error(`health-ai 호출 오류: ${(error as Error).message}`);
      throw AppException.aiAgentUnavailable();
    } finally {
      clearTimeout(timeout);
    }
  }
}
