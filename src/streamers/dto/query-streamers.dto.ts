// src/streamers/dto/query-streamers.dto.ts
import {
  IsOptional,
  IsString,
  IsBoolean,
  IsNumber,
  Min,
  Max,
  IsInt,
  IsIn,
  MaxLength,
} from "class-validator";
import { Transform, Type } from "class-transformer";
import { ApiProperty } from "@nestjs/swagger";

export class QueryStreamersDto {
  @ApiProperty({
    description: "방송인 이름으로 검색 (부분 일치)",
    required: false,
    example: "숙",
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiProperty({
    description: "플랫폼으로 필터링",
    required: false,
    example: "chzzk",
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  platform?: string;

  @ApiProperty({
    description: "인증 상태로 필터링",
    required: false,
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => value === "true")
  @IsBoolean()
  isVerified?: boolean;

  @ApiProperty({
    description: "활성 상태로 필터링",
    required: false,
    default: true,
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => value === "true")
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({
    description: "정렬 기준 필드의 값 (무한 스크롤용)",
    required: false,
    example: "한동숙",
  })
  @IsOptional()
  @IsString()
  cursorValue?: string;

  @ApiProperty({
    description: "커서 ID (무한 스크롤용)",
    required: false,
    example: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  cursorId?: number;

  @ApiProperty({
    description: "페이지 크기",
    required: false,
    default: 20,
    minimum: 1,
    maximum: 100,
    example: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiProperty({
    description: "정렬 기준",
    enum: ["id", "createdAt", "updatedAt", "name", "popular"],
    required: false,
    default: "id",
    example: "createdAt",
  })
  @IsOptional()
  @IsIn(["id", "createdAt", "updatedAt", "name", "popular"])
  @Transform(({ value }: { value?: string }) => value || "id")
  sortBy: "id" | "createdAt" | "updatedAt" | "name" | "popular" = "id";

  @ApiProperty({
    description: "정렬 순서",
    enum: ["ASC", "DESC"],
    required: false,
    default: "DESC",
    example: "DESC",
  })
  @IsOptional()
  @IsIn(["ASC", "DESC"])
  @Transform(({ value }: { value?: string }) => value?.toUpperCase() || "DESC")
  sortOrder: "ASC" | "DESC" = "DESC";
}
