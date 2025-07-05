// src/schedules/dto/query-schedules.dto.ts
import {
  IsOptional,
  IsString,
  IsBoolean,
  IsNumber,
  Min,
  Max,
  IsDateString,
  IsUUID,
  IsArray,
  IsIn,
} from "class-validator";
import { Transform, Type } from "class-transformer";
import { ApiProperty } from "@nestjs/swagger";

export class QuerySchedulesDto {
  @Transform(({ value }: { value: string }) => value.split(","))
  @IsOptional()
  @IsArray()
  @IsUUID(4, { each: true })
  @ApiProperty({
    description: "방송인 UUID 목록 (복수 선택 가능)",
    required: false,
    example: ["550e8400-e29b-41d4-a716-446655440000"],
    isArray: true,
  })
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
    description: "일정 제목으로 검색",
    required: false,
    example: "게임",
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({
    description: "시간 미정 일정만 조회",
    required: false,
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => value === "true")
  @IsBoolean()
  isTimeUndecided?: boolean;

  @ApiProperty({
    description: "휴방 일정만 조회",
    required: false,
    example: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === "true")
  @IsBoolean()
  isBreak?: boolean;

  @ApiProperty({
    description: "커서 기준 날짜 (무한 스크롤용)",
    required: false,
    example: "2025-01-15",
  })
  @IsOptional()
  @IsDateString({}, { message: "올바른 날짜 형식이어야 합니다." })
  cursorDate?: string;

  @ApiProperty({
    description: "커서 기준 시작 시간 (무한 스크롤용, null 가능)",
    required: false,
    example: "18:00:00",
  })
  @IsOptional()
  @IsString()
  cursorStartTime?: string;

  @ApiProperty({
    description: "커서 ID (무한 스크롤용)",
    required: false,
    example: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  cursorId?: number;

  @ApiProperty({
    description: "페이지 크기",
    required: false,
    default: 20,
    minimum: 1,
    maximum: 100,
    example: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiProperty({
    description: "정렬 기준",
    enum: ["scheduleDate", "createdAt", "updatedAt", "startTime"],
    required: false,
    default: "scheduleDate",
    example: "scheduleDate",
  })
  @IsOptional()
  @IsIn(["scheduleDate", "createdAt", "updatedAt", "startTime"])
  @Transform(({ value }: { value?: string }) => value || "scheduleDate")
  sortBy: "scheduleDate" | "createdAt" | "updatedAt" | "startTime" = "scheduleDate";

  @ApiProperty({
    description: "정렬 순서",
    enum: ["ASC", "DESC"],
    required: false,
    default: "ASC",
    example: "ASC",
  })
  @IsOptional()
  @IsIn(["ASC", "DESC"])
  @Transform(({ value }: { value?: string }) => value?.toUpperCase() || "ASC")
  sortOrder: "ASC" | "DESC" = "ASC";
}
