// src/streamers/dto/create-streamer.dto.ts
import {
  IsString,
  IsOptional,
  IsArray,
  IsNotEmpty,
  IsUrl,
  ValidateNested,
  MaxLength,
  MinLength,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty } from "@nestjs/swagger";

export class PlatformDto {
  @ApiProperty({
    example: "chzzk",
    description: "플랫폼 이름 (chzzk, youtube, soop 등)",
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  platformName: string;

  @ApiProperty({
    example: "https://chzzk.naver.com/",
    description: "채널 URL",
    required: false,
    maxLength: 500,
  })
  @IsUrl({}, { message: "올바른 URL 형식이어야 합니다." })
  @IsOptional()
  @MaxLength(500)
  channelUrl?: string;
}

export class CreateStreamerDto {
  @ApiProperty({
    example: "한동숙",
    description: "방송인 이름",
    minLength: 1,
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(1, { message: "방송인 이름은 최소 1글자 이상이어야 합니다." })
  @MaxLength(20, { message: "방송인 이름은 최대 20글자까지 가능합니다." })
  name: string;

  @ApiProperty({
    example: "https://example.com/profile.jpg",
    description: "프로필 이미지 URL",
    required: false,
    maxLength: 500,
  })
  @IsUrl({}, { message: "올바른 URL 형식이어야 합니다." })
  @IsOptional()
  @MaxLength(500)
  profileImageUrl?: string;

  @ApiProperty({
    example: "게임 방송을 주로 하는 스트리머입니다.",
    description: "방송인 설명",
    required: false,
    maxLength: 1000,
  })
  @IsString()
  @IsOptional()
  @MaxLength(1000, { message: "설명은 최대 1000글자까지 가능합니다." })
  description?: string;

  @ApiProperty({
    type: [PlatformDto],
    description: "플랫폼 목록",
    required: false,
    maxItems: 10,
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PlatformDto)
  @IsOptional()
  platforms?: PlatformDto[];
}
