// src/streamers/dto/update-streamer.dto.ts
import { PartialType } from "@nestjs/mapped-types";
import { CreateStreamerDto } from "./create-streamer.dto";
import { ApiProperty } from "@nestjs/swagger";
import { IsDateString } from "class-validator";

export class UpdateStreamerDto extends PartialType(CreateStreamerDto) {
  @ApiProperty({
    example: "한동숙 (수정됨)",
    description: "방송인 이름",
    required: false,
  })
  name?: string;

  @ApiProperty({
    example: "https://example.com/new-profile.jpg",
    description: "프로필 이미지 URL",
    required: false,
  })
  profileImageUrl?: string;

  @ApiProperty({
    example: "새로운 설명입니다.",
    description: "방송인 설명",
    required: false,
  })
  description?: string;

  @ApiProperty({
    description: "플랫폼 목록 (전체 교체)",
    required: false,
  })
  platforms?: Array<{
    platformName: string;
    channelUrl?: string;
  }>;

  @ApiProperty({
    example: "2025-07-03T10:00:00.000Z",
    description: "마지막 수정 시간 (충돌 방지용)",
    required: true,
  })
  @IsDateString()
  lastUpdatedAt: string;
}
