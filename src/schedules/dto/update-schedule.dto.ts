// src/schedules/dto/update-schedule.dto.ts
import { PartialType } from "@nestjs/mapped-types";
import { CreateScheduleDto } from "./create-schedule.dto";
import { ApiProperty } from "@nestjs/swagger";
import { IsDateString } from "class-validator";

export class UpdateScheduleDto extends PartialType(CreateScheduleDto) {
  @ApiProperty({
    example: "수정된 게임방송",
    description: "일정 제목",
    required: false,
  })
  title?: string;

  @ApiProperty({
    example: "2025-01-15T19:00:00Z",
    description: "시작 시간",
    required: false,
  })
  startTime?: string;

  @ApiProperty({
    example: false,
    description: "시간 미정 여부",
    required: false,
  })
  isTimeUndecided?: boolean;

  @ApiProperty({
    example: false,
    description: "휴방 여부",
    required: false,
  })
  isBreak?: boolean;

  @ApiProperty({
    example: "수정된 설명입니다.",
    description: "일정 설명",
    required: false,
  })
  description?: string;

  @ApiProperty({
    example: "2025-01-14T15:30:00.000Z",
    description: "마지막 수정 시간 (충돌 방지용)",
    required: true,
  })
  @IsDateString()
  lastUpdatedAt: string;

  // streamerUuid와 scheduleDate는 수정 불가이므로 제외
}
