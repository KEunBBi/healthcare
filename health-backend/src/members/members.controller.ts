import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { HEALTH_DATA_TYPES } from '../common/health-data-type';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/authenticated-user';
import { HealthDataQueryDto } from './dto/health-data-query.dto';
import { ListMembersQueryDto } from './dto/list-members-query.dto';
import { MembersService } from './members.service';

@ApiTags('members')
@ApiBearerAuth('accessToken')
@Controller('members')
@UseGuards(JwtAuthGuard)
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @Get()
  @ApiOperation({
    summary: '회원 목록 조회',
    description: '의사 계정은 조건에 맞는 전체 회원 목록을, 환자 계정은 전송값과 무관하게 자기 자신 1건만 반환한다.',
  })
  @ApiQuery({ name: 'userId', required: false, description: '검색할 회원아이디(부분일치, 의사 전용)' })
  @ApiQuery({ name: 'role', required: false, enum: ['DOCTOR', 'PATIENT'], description: '회원유형 필터(의사 전용)' })
  @ApiOkResponse({
    description: '조회 성공',
    schema: {
      example: {
        success: true,
        data: {
          members: [
            {
              userId: 'user_001',
              name: '김민준',
              gender: 'M',
              birthDate: '19980722',
              role: 'PATIENT',
              createdAt: '2026-01-01T00:00:00.000Z',
              updatedAt: '2026-01-01T00:00:00.000Z',
            },
          ],
        },
        error: null,
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'AccessToken 누락/만료/위조 (AUTH_FAILED)' })
  list(@CurrentUser() currentUser: AuthenticatedUser, @Query() query: ListMembersQueryDto) {
    return this.membersService.list(currentUser, query);
  }

  @Get(':userId')
  @ApiOperation({
    summary: '회원 상세조회',
    description:
      '회원 기본정보 + 보유질병 + 최근 7일간의 체중·혈압·혈당 데이터를 반환한다. 심박·걸음수 등 실시간 그래프 데이터는 WebSocket(/realtime)으로 별도 전달된다.',
  })
  @ApiParam({ name: 'userId', description: '조회할 회원아이디', example: 'user_001' })
  @ApiOkResponse({
    description: '조회 성공',
    schema: {
      example: {
        success: true,
        data: {
          member: {
            userId: 'user_001',
            name: '김민준',
            gender: 'M',
            birthDate: '19980722',
            role: 'PATIENT',
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
            diseases: [{ diseaseCode: 'HYP', nameKr: '고혈압', diagnosedAt: '2025-03-10T00:00:00.000Z' }],
            memo: null,
          },
          recentWeights: [{ measuredAt: '2026-07-16T08:00:00.000Z', weightKg: 72.5, bmi: 22.9 }],
          recentBloodPressures: [{ measuredAt: '2026-07-16T06:00:00.000Z', systolic: 118, diastolic: 76, status: null }],
          recentGlucoses: [{ measuredAt: '2026-07-16T07:00:00.000Z', glucoseMgDl: 96, status: 'normal' }],
        },
        error: null,
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'AccessToken 누락/만료/위조 (AUTH_FAILED)' })
  @ApiForbiddenResponse({ description: '환자 계정이 자기 자신이 아닌 회원을 조회 (FORBIDDEN)' })
  @ApiNotFoundResponse({ description: '존재하지 않는 회원아이디 (MEMBER_NOT_FOUND)' })
  detail(@CurrentUser() currentUser: AuthenticatedUser, @Param('userId') userId: string) {
    return this.membersService.detail(currentUser, userId);
  }

  @Get(':userId/health-data')
  @ApiOperation({
    summary: '회원 건강 데이터 조회',
    description: '혈압·혈당·체중·심박·걸음수 등 건강데이터를 종류(type)별로 테이블에서 개별 조회한다. 기간(startAt~endAt) 조건을 반드시 지정해야 한다.',
  })
  @ApiParam({ name: 'userId', description: '조회할 회원아이디', example: 'user_001' })
  @ApiQuery({ name: 'type', enum: HEALTH_DATA_TYPES, description: '조회할 건강데이터 종류' })
  @ApiQuery({ name: 'startAt', description: '조회 시작일시 (ISO 8601)', example: '2026-07-16T00:00:00.000Z' })
  @ApiQuery({ name: 'endAt', description: '조회 종료일시 (ISO 8601)', example: '2026-07-17T00:00:00.000Z' })
  @ApiOkResponse({
    description: '조회 성공',
    schema: {
      example: {
        success: true,
        data: {
          type: 'heartRate',
          records: [
            {
              seq: '1',
              userId: 'user_001',
              heartRate: 78,
              status: null,
              note: null,
              measuredAt: '2026-07-16T09:00:00.000Z',
              createdAt: '2026-07-16T09:00:00.000Z',
            },
          ],
        },
        error: null,
      },
    },
  })
  @ApiBadRequestResponse({ description: 'startAt이 endAt보다 늦음 (INVALID_DATE_RANGE)' })
  @ApiUnauthorizedResponse({ description: 'AccessToken 누락/만료/위조 (AUTH_FAILED)' })
  @ApiForbiddenResponse({ description: '환자 계정이 자기 자신이 아닌 회원을 조회 (FORBIDDEN)' })
  @ApiNotFoundResponse({ description: '존재하지 않는 회원아이디 (MEMBER_NOT_FOUND)' })
  healthData(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('userId') userId: string,
    @Query() query: HealthDataQueryDto,
  ) {
    return this.membersService.healthData(currentUser, userId, query);
  }
}
