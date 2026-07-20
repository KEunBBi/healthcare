import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ChatMessageDto } from './dto/chat-message.dto';
import { ChatService } from './chat.service';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  async ask(@Body() dto: ChatMessageDto) {
    return { answer: await this.chatService.ask(dto.message) };
  }
}
