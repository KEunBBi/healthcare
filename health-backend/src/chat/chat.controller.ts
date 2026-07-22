import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ChatMessageDto } from './dto/chat-message.dto';
import { ChatService } from './chat.service';

@ApiTags('chat')
@ApiBearerAuth('accessToken')
@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  @ApiOperation({ summary: '챗봇 질의 (health-ai Agent 프록시)' })
  @ApiUnauthorizedResponse({ description: 'AccessToken 누락/만료/위조 (AUTH_FAILED)' })
  async ask(@Body() dto: ChatMessageDto) {
    return { answer: await this.chatService.ask(dto.message, dto.history) };
  }
}
