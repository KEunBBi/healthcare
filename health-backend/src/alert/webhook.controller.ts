import { Body, Controller, Post } from '@nestjs/common';
import { SlackService } from './slack.service';
import { WebhookMessageDto } from './dto/webhook-message.dto';

@Controller('webhook')
export class WebhookController {
  constructor(private readonly slackService: SlackService) {}

  @Post()
  async send(@Body() dto: WebhookMessageDto) {
    const sent = await this.slackService.sendMessage(dto.message);
    return { sent, sentAt: new Date().toISOString() };
  }
}
