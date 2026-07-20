import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

export class ListMembersQueryDto {
  @ApiPropertyOptional({ description: '검색할 회원아이디(부분일치). 의사 계정에서만 유효', example: 'user_00' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ description: '회원유형 필터. 의사 계정에서만 유효', enum: ['DOCTOR', 'PATIENT'] })
  @IsOptional()
  @IsIn(['DOCTOR', 'PATIENT'])
  role?: 'DOCTOR' | 'PATIENT';
}
