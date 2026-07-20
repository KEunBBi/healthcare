import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'user_001', description: '회원아이디' })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({ example: 'user_001123!', description: '비밀번호' })
  @IsString()
  @IsNotEmpty()
  passwd: string;
}
