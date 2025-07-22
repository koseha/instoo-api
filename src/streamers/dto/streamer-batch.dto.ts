import { ApiProperty } from "@nestjs/swagger";
import { ArrayMaxSize, IsArray, IsString, IsUUID } from "class-validator";

export class StreamerBatchRequestDto {
  @ApiProperty({
    example: ["550e8400-e29b-41d4-a716-446655440000", "550e8400-e29b-41d4-a716-446655440001"],
    description: "조회할 방송인 UUID 배열",
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsUUID(4, { each: true })
  @ArrayMaxSize(50) // 최대 50개로 제한
  uuids: string[];
}
