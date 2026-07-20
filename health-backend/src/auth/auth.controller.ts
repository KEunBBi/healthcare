import { Body, Controller, Post, Req, Res } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AppException } from '../common/exceptions/app.exception';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

const REFRESH_TOKEN_COOKIE = 'refreshToken';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({
    summary: '회원 로그인',
    description:
      'id/passwd 인증 후 AccessToken·회원정보를 응답 바디로 반환하고, RefreshToken은 HttpOnly 쿠키(Set-Cookie)로 내려준다.',
  })
  @ApiOkResponse({
    description: '로그인 성공',
    schema: {
      example: {
        success: true,
        data: {
          accessToken: 'eyJhbGciOi...',
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
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const { accessToken, refreshToken, refreshTokenMaxAgeMs, user } = await this.authService.login(dto);
    this.setRefreshTokenCookie(res, refreshToken, refreshTokenMaxAgeMs);
    return { accessToken, user };
  }

  @Post('refresh')
  @ApiOperation({
    summary: 'AccessToken 재발급',
    description: '요청 쿠키의 RefreshToken(HttpOnly)을 검증해 새 AccessToken을 발급받는다.',
  })
  @ApiOkResponse({
    description: '재발급 성공',
    schema: { example: { success: true, data: { accessToken: 'eyJhbGciOi...' }, error: null } },
  })
  @ApiUnauthorizedResponse({ description: 'RefreshToken 쿠키 없음/만료/위조 (INVALID_REFRESH_TOKEN)' })
  refresh(@Req() req: Request) {
    const refreshToken = (req.cookies as Record<string, string | undefined>)?.[REFRESH_TOKEN_COOKIE];
    if (!refreshToken) {
      throw AppException.invalidRefreshToken();
    }
    return this.authService.refresh(refreshToken);
  }

  private setRefreshTokenCookie(res: Response, refreshToken: string, maxAgeMs: number): void {
    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      path: '/api/auth',
      maxAge: maxAgeMs,
    });
  }
}
