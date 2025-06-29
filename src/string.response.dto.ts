// src/common/dto/string-response.dto.ts
import { ApiProperty } from "@nestjs/swagger";

export class StringResponseDto {
  @ApiProperty({
    type: "string",
    description: "응답 메시지",
    example: "Hello World!",
  })
  message: string;

  constructor(message: string = "") {
    this.message = message;
  }
}
