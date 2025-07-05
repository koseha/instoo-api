// src/schedules/dto/schedule-response.dto.ts
import { User } from "@/users/entities/user.entity";
import { Streamer } from "@/streamers/entities/streamer.entity";
import { ApiProperty } from "@nestjs/swagger";
import { Schedule } from "../entities/schedule.entity";

export class UserSummaryDto {
  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440000",
    description: "사용자 UUID",
  })
  uuid: string;

  @ApiProperty({
    example: "칸봄봄",
    description: "사용자 닉네임",
  })
  nickname: string;

  static of(user: User | undefined): UserSummaryDto | undefined {
    if (!user) return undefined;
    const dto = new UserSummaryDto();
    dto.uuid = user.uuid;
    dto.nickname = user.nickname;
    return dto;
  }
}

export class StreamerSummaryDto {
  @ApiProperty({
    example: 1,
    description: "방송인 ID",
  })
  id: number;

  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440000",
    description: "방송인 UUID",
  })
  uuid: string;

  @ApiProperty({
    example: "우왁굳",
    description: "방송인 이름",
  })
  name: string;

  @ApiProperty({
    example: "https://example.com/profile.jpg",
    description: "프로필 이미지 URL",
    nullable: true,
  })
  profileImageUrl?: string;

  @ApiProperty({
    example: true,
    description: "인증 여부",
  })
  isVerified: boolean;

  static of(streamer: Streamer): StreamerSummaryDto {
    return {
      id: streamer.id,
      uuid: streamer.uuid,
      name: streamer.name,
      profileImageUrl: streamer.profileImageUrl,
      isVerified: streamer.isVerified,
    };
  }
}

export class ScheduleResponseDto {
  @ApiProperty({
    example: 1,
    description: "일정 ID",
  })
  id: number;

  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440000",
    description: "일정 UUID",
  })
  uuid: string;

  @ApiProperty({
    example: "게임방송",
    description: "일정 제목",
  })
  title: string;

  @ApiProperty({
    example: "2025-01-15",
    description: "일정 날짜",
  })
  scheduleDate: string;

  @ApiProperty({
    example: "18:00:00",
    description: "시작 시간 (HH:mm:ss 형식)",
    nullable: true,
  })
  startTime?: string;

  @ApiProperty({
    example: false,
    description: "시간 미정 여부",
  })
  isTimeUndecided: boolean;

  @ApiProperty({
    example: false,
    description: "휴방 여부",
  })
  isBreak: boolean;

  @ApiProperty({
    example: "롤 랭크게임 예정",
    description: "일정 설명",
    nullable: true,
  })
  description?: string;

  @ApiProperty({
    type: StreamerSummaryDto,
    description: "방송인 정보",
  })
  streamer: StreamerSummaryDto;

  @ApiProperty({
    type: UserSummaryDto,
    description: "생성자 정보",
    nullable: true,
  })
  createdBy?: UserSummaryDto;

  @ApiProperty({
    type: UserSummaryDto,
    description: "수정자 정보",
    nullable: true,
  })
  updatedBy?: UserSummaryDto;

  @ApiProperty({
    example: 1,
    description: "버전 (충돌 방지용)",
  })
  version: number;

  @ApiProperty({
    example: "2025-01-14T10:00:00.000Z",
    description: "생성일시",
  })
  createdAt: string;

  @ApiProperty({
    example: "2025-01-14T15:30:00.000Z",
    description: "수정일시 (충돌 방지용)",
  })
  updatedAt: string;

  static of(schedule: Schedule): ScheduleResponseDto {
    return {
      id: schedule.id,
      uuid: schedule.uuid,
      title: schedule.title,
      scheduleDate: schedule.scheduleDate.toISOString().split("T")[0], // YYYY-MM-DD 형식
      startTime: schedule.startTime
        ? schedule.startTime.toISOString().split("T")[1].split(".")[0] // HH:mm:ss 형식
        : undefined,
      isTimeUndecided: schedule.isTimeUndecided,
      isBreak: schedule.isBreak,
      description: schedule.description,
      streamer: StreamerSummaryDto.of(schedule.streamer),
      createdBy: UserSummaryDto.of(schedule.createdByUser),
      updatedBy: UserSummaryDto.of(schedule.updatedByUser),
      version: schedule.version,
      createdAt: schedule.createdAt.toISOString(),
      updatedAt: schedule.updatedAt.toISOString(),
    };
  }
}

// 커서 DTO
export class ScheduleCursorDto {
  @ApiProperty({
    example: "2025-01-15",
    description: "일정 날짜",
  })
  scheduleDate: string;

  @ApiProperty({
    example: "18:00:00",
    description: "시작 시간 (HH:mm:ss 형식, null일 수 있음)",
    nullable: true,
  })
  startTime: string | null;

  @ApiProperty({
    example: 123,
    description: "일정 ID",
  })
  id: number;
}

// 페이지 정보 DTO
export class SchedulePageInfoDto {
  @ApiProperty({
    type: ScheduleCursorDto,
    nullable: true,
    description: "다음 페이지 커서",
  })
  next: ScheduleCursorDto | null;

  @ApiProperty({
    example: true,
    description: "추가 데이터 존재 여부",
  })
  hasMore: boolean;
}

// 페이징된 일정 응답 DTO
export class PagedScheduleResponseDto {
  @ApiProperty({
    example: 20,
    description: "페이지 크기",
  })
  size: number;

  @ApiProperty({
    type: SchedulePageInfoDto,
    description: "페이지 정보",
  })
  page: SchedulePageInfoDto;

  @ApiProperty({
    type: [ScheduleResponseDto],
    description: "일정 목록",
  })
  data: ScheduleResponseDto[];
}
