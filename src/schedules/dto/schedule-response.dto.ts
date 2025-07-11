// src/schedules/dto/schedule-response.dto.ts
import { User } from "@/users/entities/user.entity";
import { Streamer } from "@/streamers/entities/streamer.entity";
import { ApiProperty } from "@nestjs/swagger";
import { Schedule } from "../entities/schedule.entity";
import { ScheduleStatus } from "@/common/constants/schedule-status.enum";
import { TimeUtils } from "@/common/utils/time.utils";

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
    example: "550e8400-e29b-41d4-a716-446655440000",
    description: "방송인 UUID",
  })
  uuid: string;

  @ApiProperty({
    example: "한동숙",
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
      uuid: streamer.uuid,
      name: streamer.name,
      profileImageUrl: streamer.profileImageUrl,
      isVerified: streamer.isVerified,
    };
  }
}

export class ScheduleResponseDto {
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
    description: "시작 시간 (HH:mm:ss 형식, KST 기준)",
    nullable: true,
  })
  startTime?: string;

  @ApiProperty({
    example: ScheduleStatus.SCHEDULED,
    description: "일정 상태",
    enum: ScheduleStatus,
  })
  status: ScheduleStatus;

  @ApiProperty({
    example: false,
    description: "시간 미정 여부 (하위 호환성)",
  })
  isTimeUndecided: boolean;

  @ApiProperty({
    example: false,
    description: "휴방 여부 (하위 호환성)",
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
      uuid: schedule.uuid,
      title: schedule.title,
      // scheduleDate는 이미 문자열(YYYY-MM-DD)로 저장되어 있으므로 그대로 사용
      scheduleDate: schedule.scheduleDate,
      // startTime을 UTC에서 KST로 변환하여 HH:mm:ss 형식으로 반환
      startTime: schedule.startTime
        ? TimeUtils.toKstTimeOnly(schedule.startTime) // HH:mm 형식
        : undefined,
      // 새로운 status 필드
      status: schedule.status,
      // 하위 호환성을 위한 computed 필드들
      isTimeUndecided: schedule.status === ScheduleStatus.TIME_TBD,
      isBreak: schedule.status === ScheduleStatus.BREAK,
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

// 일정 기본 정보 DTO
export class ScheduleBaseInfoDto {
  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440000",
    description: "일정 고유 식별자 (UUID)",
  })
  uuid: string;

  @ApiProperty({
    example: "20:00",
    description: "시작 시간 KST",
    nullable: true,
    type: String,
  })
  startTime: string | null;

  @ApiProperty({
    example: "게임 방송",
    description: "일정 제목",
  })
  title: string;

  @ApiProperty({
    example: "스트리머A",
    description: "스트리머 이름",
  })
  streamerName: string;

  @ApiProperty({
    example: ["chzzk", "soop", "youtube"],
    description: "스트리머가 활동하는 플랫폼 목록",
    isArray: true,
    type: String,
  })
  streamerPlatforms: string[];
}

// 일정 목록 응답 DTO
export class SchedulesResponseDto {
  @ApiProperty({
    example: "2025-01-15",
    description: "일정 날짜 (YYYY-MM-DD 형식)",
  })
  scheduleDate: string;

  @ApiProperty({
    type: [ScheduleBaseInfoDto],
    description: "휴방 일정 목록",
  })
  breaks: ScheduleBaseInfoDto[];

  @ApiProperty({
    type: [ScheduleBaseInfoDto],
    description: "시간 미정 일정 목록",
  })
  tbd: ScheduleBaseInfoDto[];

  @ApiProperty({
    type: [ScheduleBaseInfoDto],
    description: "시간 확정 일정 목록",
  })
  scheduled: ScheduleBaseInfoDto[];
}
