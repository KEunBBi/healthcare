import { IsNotEmpty, IsString } from 'class-validator';

export class WebhookMessageDto {
  @IsString()
  @IsNotEmpty()
  message: string;
}
