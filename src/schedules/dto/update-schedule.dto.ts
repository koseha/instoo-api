// src/schedules/dto/update-schedule.dto.ts
import { Trim } from "@/common/decorators/trim.decorator";
import { CreateScheduleDto } from "./create-schedule.dto";
import { ApiProperty } from "@nestjs/swagger";
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateIf,
} from "class-validator";
import { ScheduleStatus } from "@/common/constants/schedule-status.enum";

export class UpdateScheduleDto {
  @ApiProperty({
    example: "게임방송",
    description: "일정 제목",
    minLength: 1,
    maxLength: 50,
  })
  @Trim()
  @IsString()
  @MinLength(1, { message: "제목은 최소 1글자 이상이어야 합니다." })
  @MaxLength(50, { message: "제목은 최대 50글자까지 가능합니다." })
  title: string;

  @ApiProperty({
    example: "2025-01-15T18:00:00Z",
    description: "시작 시간 (확정시간일 때만 필요) UTC",
    required: false,
  })
  @IsOptional()
  @ValidateIf((o: CreateScheduleDto) => o.status === ScheduleStatus.SCHEDULED)
  @IsDateString({}, { message: "올바른 시간 형식이어야 합니다." })
  startTime?: string;

  @ApiProperty({
    example: ScheduleStatus.SCHEDULED,
    description: "일정 상태",
    enum: ScheduleStatus,
    default: ScheduleStatus.SCHEDULED,
  })
  @IsEnum(ScheduleStatus, { message: "올바른 일정 상태여야 합니다." })
  status: ScheduleStatus = ScheduleStatus.SCHEDULED;

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
    example: "url~~",
    description: "참고 링크",
    required: false,
    maxLength: 300,
  })
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(300, { message: "참고 링크는 최대 300글자까지 가능합니다." })
  externalNoticeUrl?: string;

  @ApiProperty({
    example: "2025-01-14T15:30:00.000Z",
    description: "마지막 수정 시간 (충돌 방지용)",
    required: true,
  })
  @IsDateString()
  lastUpdatedAt: string;
}
