// src/schedules/dto/update-schedule.dto.ts
import { PartialType } from "@nestjs/mapped-types";
import { CreateScheduleDto } from "./create-schedule.dto";
import { ApiProperty, OmitType } from "@nestjs/swagger";
import { IsDateString } from "class-validator";

export class UpdateScheduleDto extends PartialType(
  OmitType(CreateScheduleDto, ["streamerUuid", "scheduleDate"] as const),
) {
  @ApiProperty({
    example: "2025-01-14T15:30:00.000Z",
    description: "마지막 수정 시간 (충돌 방지용)",
    required: true,
  })
  @IsDateString()
  lastUpdatedAt: string;

  // streamerUuid와 scheduleDate는 수정 불가이므로 제외
}
