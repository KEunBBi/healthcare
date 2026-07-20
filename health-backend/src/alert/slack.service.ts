import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SlackService {
  private readonly logger = new Logger(SlackService.name);
  private readonly webhookUrl: string | undefined;
  private readonly serverOwner: string;

  constructor(private readonly configService: ConfigService) {
    this.webhookUrl = this.configService.get<string>('SLACK_WEBHOOK_URL');
    // 여러 학생이 같은 Slack 채널을 공유하므로, DB 유저 아이디로 어느 서버가 보낸 메시지인지 구분한다.
    this.serverOwner = this.configService.get<string>('DATABASE_USER', 'unknown');
  }

  async sendMessage(text: string): Promise<boolean> {
    if (!this.webhookUrl) {
      this.logger.warn('SLACK_WEBHOOK_URL이 설정되지 않아 메시지를 전송하지 않습니다.');
      return false;
    }

    const labeledText = `[${this.serverOwner} 서버] ${text}`;

    try {
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: labeledText }),
      });

      if (!response.ok) {
        this.logger.error(`Slack 전송 실패: ${response.status} ${await response.text()}`);
        return false;
      }
      return true;
    } catch (error) {
      this.logger.error(`Slack 전송 오류: ${(error as Error).message}`);
      return false;
    }
  }
}
