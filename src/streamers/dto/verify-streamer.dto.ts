// src/streamers/dto/verify-streamer.dto.ts
import { IsBoolean } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class VerifyStreamerDto {
  @ApiProperty({
    example: true,
    description: "인증 여부 (true: 인증, false: 인증 해제)",
  })
  @IsBoolean()
  isVerified: boolean;
}
