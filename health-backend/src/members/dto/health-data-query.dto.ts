import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsISO8601 } from 'class-validator';
import { HEALTH_DATA_TYPES, type HealthDataType } from '../../common/health-data-type';

export class HealthDataQueryDto {
  @ApiProperty({ description: '조회할 건강데이터 종류', enum: HEALTH_DATA_TYPES, example: 'heartRate' })
  @IsIn(HEALTH_DATA_TYPES)
  type: HealthDataType;

  @ApiProperty({ description: '조회 시작일시 (ISO 8601)', example: '2026-07-16T00:00:00.000Z' })
  @IsISO8601()
  startAt: string;

  @ApiProperty({ description: '조회 종료일시 (ISO 8601)', example: '2026-07-17T00:00:00.000Z' })
  @IsISO8601()
  endAt: string;
}
