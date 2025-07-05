// src/schedules/dto/create-schedule.dto.ts
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsDateString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateIf,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { Trim } from "@/common/decorators/trim.decorator";

export class CreateScheduleDto {
  @ApiProperty({
    example: "게임방송",
    description: "일정 제목",
    minLength: 1,
    maxLength: 200,
  })
  @Trim()
  @IsString()
  @MinLength(1, { message: "제목은 최소 1글자 이상이어야 합니다." })
  @MaxLength(200, { message: "제목은 최대 200글자까지 가능합니다." })
  title: string;

  @ApiProperty({
    example: "2025-01-15",
    description: "일정 날짜 (YYYY-MM-DD 형식)",
  })
  @IsDateString({}, { message: "올바른 날짜 형식이어야 합니다. (YYYY-MM-DD)" })
  scheduleDate: string;

  @ApiProperty({
    example: "2025-01-15T18:00:00Z",
    description: "시작 시간 (확정시간일 때만 필요)",
    required: false,
  })
  @IsOptional()
  @ValidateIf((o: CreateScheduleDto) => !o.isTimeUndecided && !o.isBreak)
  @IsDateString({}, { message: "올바른 시간 형식이어야 합니다." })
  startTime?: string;

  @ApiProperty({
    example: false,
    description: "시간 미정 여부",
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isTimeUndecided?: boolean = false;

  @ApiProperty({
    example: false,
    description: "휴방 여부",
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isBreak?: boolean = false;

  @ApiProperty({
    example: "롤 랭크게임 예정",
    description: "일정 설명",
    required: false,
    maxLength: 1000,
  })
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(1000, { message: "설명은 최대 1000글자까지 가능합니다." })
  description?: string;

  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440000",
    description: "방송인 UUID",
  })
  @IsUUID(4, { message: "올바른 방송인 ID 형식이어야 합니다." })
  streamerUuid: string;
}
