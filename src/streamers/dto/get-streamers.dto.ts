// src/streamers/dto/get-streamers.dto.ts
import {
  IsOptional,
  IsBoolean,
  IsIn,
  IsArray,
  IsNumber,
  Min,
  Max,
  IsString,
} from "class-validator";
import { Transform, Type } from "class-transformer";
import { ApiProperty } from "@nestjs/swagger";

export class GetStreamersDto {
  @ApiProperty({
    description: "방송인 검색",
    required: false,
    example: "한동",
  })
  @IsOptional()
  @IsString()
  qName: string;

  @ApiProperty({
    description: "인증 상태로 필터링",
    required: true,
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => value === "true")
  @IsBoolean()
  isVerified: boolean;

  @ApiProperty({
    description: "플랫폼으로 필터링",
    required: false,
    example: ["chzzk"],
  })
  @IsOptional()
  @IsArray()
  platforms?: string[];

  @ApiProperty({
    description: "정렬 기준 - 팔로우 수",
    enum: ["asc", "desc"],
    required: false,
    default: "desc",
    example: "desc",
  })
  @IsOptional()
  @IsIn(["asc", "desc"])
  followCount?: "asc" | "desc" = "desc";

  @ApiProperty({
    description: "정렬 기준 - 등록일시",
    enum: ["asc", "desc"],
    required: false,
    default: "desc",
    example: "desc",
  })
  @IsOptional()
  @IsIn(["asc", "desc"])
  createdAt?: "asc" | "desc" = "desc";

  @ApiProperty({
    description: "정렬 기준 - 등록일시",
    enum: ["asc", "desc"],
    required: false,
    default: "desc",
    example: "desc",
  })
  @IsOptional()
  @IsIn(["asc", "desc"])
  updatedAt?: "asc" | "desc" = "desc";

  @ApiProperty({
    description: "정렬 기준 - 등록일시",
    enum: ["asc", "desc"],
    required: false,
    default: "desc",
    example: "desc",
  })
  @IsOptional()
  @IsIn(["asc", "desc"])
  verifiedAt?: "asc" | "desc" = "desc";

  @ApiProperty({
    description: "페이지",
    required: false,
    example: 1,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page: number = 1;

  @ApiProperty({
    description: "페이지별 사이즈",
    required: false,
    example: 15,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(15)
  @Max(20)
  size: number = 15;
}
