import { ApiProperty, PartialType } from "@nestjs/swagger";
import { User } from "../entities/user.entity";
import { StreamerFollow } from "@/streamers/entities/streamer-follow.entity";
import {
  StreamerPlatformResponseDto,
  StreamerSimpleDto,
} from "@/streamers/dto/streamer-response.dto";

export class UserInfoDto {
  @ApiProperty({ description: "사용자 UUID", example: "123e4567-e89b-12d3-a456-426614174000" })
  uuid: string;

  @ApiProperty({ description: "이메일", example: "user@example.com" })
  email: string;

  @ApiProperty({ description: "이름", example: "홍길동" })
  nickname: string;

  @ApiProperty({ description: "프로필 이미지 URL", example: "https://example.com/profile.jpg" })
  profileImageUrl?: string;

  @ApiProperty({ description: "사용자 역할", example: "USER" })
  role: string;

  @ApiProperty({ description: "활성 상태", example: true })
  isActive: boolean;

  @ApiProperty({ description: "생성일", example: "2024-01-01T00:00:00.000Z" })
  createdAt: string;

  static of(user: User) {
    const dto = new UserInfoDto();

    dto.uuid = user.uuid;
    dto.email = user.email;
    dto.nickname = user.nickname;
    dto.profileImageUrl = user.profileImageUrl;
    dto.role = user.role;
    dto.isActive = user.isActive;
    dto.createdAt = user.createdAt.toISOString();
    return dto;
  }
}

export class MyStreamerDto {
  // @ApiProperty({ description: "생성일", example: "2025-07-22T12:11:26.593Z" })
  // createdAt: string;

  @ApiProperty({ description: "스트리머 UUID", example: "1991a033-f0af-4c89-9c67-24bfe008508a" })
  uuid: string;

  @ApiProperty({ description: "활성 상태 (on/off)", example: true, nullable: true })
  isActive: boolean;

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
    type: "array",
    items: {
      type: "object",
      properties: {
        platformName: { type: "string", example: "chzzk" },
        channelUrl: { type: "string", example: "https://chzzk.tv/example" },
      },
    },
  })
  platforms: Pick<StreamerPlatformResponseDto, "platformName" | "channelUrl">[];

  @ApiProperty({
    example: 13,
    description: "팔로우 수",
  })
  followCount: number;

  @ApiProperty({
    example: true,
    description: "팔로우 여부",
  })
  isFollowed: boolean;

  static of(streamerFollow: StreamerFollow): MyStreamerDto {
    const dto = new MyStreamerDto();

    // dto.createdAt = streamerFollow.createdAt.toISOString();
    dto.isActive = streamerFollow.isActive;
    dto.uuid = streamerFollow.streamer.uuid;
    dto.name = streamerFollow.streamer.name;
    dto.profileImageUrl = streamerFollow.streamer.profileImageUrl;

    dto.platforms = (streamerFollow.streamer.platforms || []).map((m) => ({
      platformName: m.platformName,
      channelUrl: m.channelUrl,
    }));
    dto.followCount = streamerFollow.streamer.followCount;
    dto.isFollowed = true;

    return dto;
  }
}
