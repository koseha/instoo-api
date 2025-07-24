import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsArray, IsBoolean, IsString, IsUUID, ValidateNested } from "class-validator";

export class BatchUpdateItem {
  @ApiProperty({
    description: "스트리머 UUID",
    example: "123e4567-e89b-12d3-a456-426614174000",
    format: "uuid",
  })
  @IsString()
  @IsUUID()
  streamerUuid: string;

  @ApiProperty({
    description: "활성 상태 (on/off)",
    example: true,
    type: "boolean",
  })
  @IsBoolean()
  isActive: boolean;
}

export class BatchUpdateFollowStatusDto {
  @ApiProperty({
    description: "업데이트할 팔로우 상태 목록",
    type: [BatchUpdateItem],
    example: [
      {
        streamerUuid: "123e4567-e89b-12d3-a456-426614174000",
        isActive: true,
      },
      {
        streamerUuid: "987fcdeb-51a2-43d1-9c45-123456789abc",
        isActive: false,
      },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BatchUpdateItem)
  updates: BatchUpdateItem[];
}
