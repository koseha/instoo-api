// src/streamers/dto/streamer-response.dto.ts
import { User } from "@/users/entities/user.entity";
import { ApiProperty } from "@nestjs/swagger";
import { Streamer } from "../entities/streamer.entity";
import { IsBoolean } from "class-validator";

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

export class StreamerPlatformResponseDto {
  @ApiProperty({
    example: "chzzk",
    description: "플랫폼 이름",
  })
  platformName: string;

  @ApiProperty({
    example: "https://chzzk.tv/url",
    description: "채널 URL",
    nullable: true,
  })
  channelUrl?: string;

  @ApiProperty({
    example: false,
    description: "플랫폼 인증 여부",
  })
  isVerified: boolean;

  @ApiProperty({
    example: true,
    description: "플랫폼 활성 상태",
  })
  isActive: boolean;

  @ApiProperty({
    example: "2025-07-03T10:00:00.000Z",
    description: "생성일시",
  })
  createdAt: Date;

  @ApiProperty({
    example: "2025-07-03T10:00:00.000Z",
    description: "수정일시",
  })
  updatedAt: Date;
}

export class StreamerResponseDto {
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
    example: "칸봄봄",
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
    example: "게임 방송을 주로 하는 스트리머입니다.",
    description: "방송인 설명",
    nullable: true,
  })
  description?: string;

  @ApiProperty({
    example: false,
    description: "인증 여부",
  })
  isVerified: boolean;

  @ApiProperty({
    example: true,
    description: "활성 상태",
  })
  isActive: boolean;

  @ApiProperty({
    type: [StreamerPlatformResponseDto],
    description: "플랫폼 목록",
    nullable: true,
  })
  platforms: StreamerPlatformResponseDto[] | null;

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
    example: "2025-07-03T10:00:00.000Z",
    description: "생성일시",
  })
  createdAt: Date;

  @ApiProperty({
    example: "2025-07-03T10:00:00.000Z",
    description: "수정일시 (충돌 방지용)",
  })
  updatedAt: Date;

  static of(streamer: Streamer): StreamerResponseDto {
    return {
      id: streamer.id,
      uuid: streamer.uuid,
      name: streamer.name,
      profileImageUrl: streamer.profileImageUrl,
      description: streamer.description,
      isVerified: streamer.isVerified,
      isActive: streamer.isActive,
      platforms:
        streamer.platforms
          ?.filter((p) => p.isActive)
          .map((platform) => ({
            platformName: platform.platformName,
            channelUrl: platform.channelUrl,
            isVerified: platform.isVerified,
            isActive: platform.isActive,
            createdAt: platform.createdAt,
            updatedAt: platform.updatedAt,
          })) || null,
      createdBy: UserSummaryDto.of(streamer.createdByUser),
      updatedBy: UserSummaryDto.of(streamer.updatedByUser),
      createdAt: streamer.createdAt,
      updatedAt: streamer.updatedAt,
    };
  }
}

// 페이지 커서 DTO
export class StreamerPageCursorDto {
  @ApiProperty({
    example: 100,
    description: "마지막 아이템 ID",
  })
  id: number;

  @ApiProperty({
    example: "칸봄봄",
    description: "정렬 기준 필드 값",
  })
  value: string;
}

// 페이징된 방송인 응답 DTO
export class PagedStreamerResponseDto {
  @ApiProperty({
    example: 20,
    description: "페이지 크기",
  })
  size: number;

  @ApiProperty({
    example: 1,
    description: "현재 페이지 번호 (0부터 시작 또는 1부터 시작은 정책에 따라)",
  })
  page: number;

  @ApiProperty({
    example: 100,
    description: "전체 데이터 수",
    required: false,
  })
  totalCount?: number;

  @ApiProperty({
    type: [StreamerResponseDto],
    description: "방송인 목록",
  })
  data: StreamerResponseDto[];
}

// 자동완성 응답 DTO
export class StreamerAutocompleteDto {
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
    example: "감스트",
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

  @ApiProperty({
    example: ["chzzk", "youtube"],
    description: "플랫폼 목록",
  })
  platforms: string[];
}

// 인증 상태 변경 DTO
export class VerifyStreamerDto {
  @ApiProperty({
    example: true,
    description: "인증 여부 (true: 인증, false: 인증 해제)",
  })
  @IsBoolean()
  isVerified: boolean;
}

// 간편 검색 응답 DTO
export class StreamerSearchDto {
  @ApiProperty({
    example: "550e8400-e29b-41d4-a716-446655440000",
    description: "방송인 UUID",
  })
  uuid: string;

  @ApiProperty({
    example: "감스트",
    description: "방송인 이름",
  })
  name: string;

  @ApiProperty({
    example: "https://example.com/profile.jpg",
    description: "프로필 이미지 URL",
    nullable: true,
  })
  profileImageUrl?: string;

  static of(streamer: Streamer) {
    const dto = new StreamerSearchDto();

    dto.uuid = streamer.uuid;
    dto.name = streamer.name;
    dto.profileImageUrl = streamer.profileImageUrl;

    return dto;
  }
}
