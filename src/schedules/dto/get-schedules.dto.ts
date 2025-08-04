// src/schedules/dto/query-schedules.dto.ts
import { IsOptional, IsDateString, IsUUID, IsArray } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class GetSchedulesDto {
  @ApiProperty({
    description: "방송인 UUID 목록 (복수 선택 가능)",
    required: false,
    example: ["550e8400-e29b-41d4-a716-446655440000"],
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @IsUUID(4, { each: true })
  streamerUuids?: string[];

  @ApiProperty({
    description: "조회 시작 날짜 (YYYY-MM-DD)",
    required: false,
    example: "2025-01-01",
  })
  @IsOptional()
  @IsDateString({}, { message: "올바른 날짜 형식이어야 합니다." })
  startDate?: string;

  @ApiProperty({
    description: "조회 종료 날짜 (YYYY-MM-DD)",
    required: false,
    example: "2025-01-31",
  })
  @IsOptional()
  @IsDateString({}, { message: "올바른 날짜 형식이어야 합니다." })
  endDate?: string;

  @ApiProperty({
    description: "플랫폼으로 필터링",
    required: false,
    example: ["chzzk"],
  })
  @IsOptional()
  @IsArray()
  platforms?: string[];
}
