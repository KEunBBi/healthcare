import { Module } from '@nestjs/common';
import { ChatModule } from '../chat/chat.module';
import { AlertService } from './alert.service';
import { SlackService } from './slack.service';
import { WebhookController } from './webhook.controller';

@Module({
  imports: [ChatModule],
  controllers: [WebhookController],
  providers: [SlackService, AlertService],
  exports: [SlackService],
})
export class AlertModule {}
