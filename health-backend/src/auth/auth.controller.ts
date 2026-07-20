import { Body, Controller, Post } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: '회원 로그인', description: 'id/passwd 인증 후 AccessToken·RefreshToken·회원정보를 반환한다.' })
  @ApiOkResponse({
    description: '로그인 성공',
    schema: {
      example: {
        success: true,
        data: {
          accessToken: 'eyJhbGciOi...',
          refreshToken: 'eyJhbGciOi...',
          user: {
            userId: 'user_001',
            name: '김민준',
            gender: 'M',
            birthDate: '19980722',
            role: 'PATIENT',
            apiKey: 'key_001',
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
        },
        error: null,
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'id/passwd 불일치 (INVALID_CREDENTIALS)' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('refresh')
  @ApiOperation({ summary: 'AccessToken 재발급', description: '유효한 RefreshToken으로 새 AccessToken을 발급받는다.' })
  @ApiOkResponse({
    description: '재발급 성공',
    schema: { example: { success: true, data: { accessToken: 'eyJhbGciOi...' }, error: null } },
  })
  @ApiUnauthorizedResponse({ description: 'RefreshToken 만료/위조 (INVALID_REFRESH_TOKEN)' })
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto);
  }
}
