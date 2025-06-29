// src/common/dto/success-response.dto.ts
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { PaginationMeta } from "../interfaces/response.interface";

export class InstooSuccessResponse<T = unknown> {
  @ApiProperty({
    description: "응답 성공 여부",
    example: true,
  })
  readonly success: true;

  @ApiProperty({
    description: "응답 데이터",
  })
  readonly data: T;

  @ApiPropertyOptional({
    description: "응답 메시지",
    example: "요청이 성공적으로 처리되었습니다.",
  })
  readonly message?: string;

  @ApiPropertyOptional({
    description: "페이지네이션 메타 정보",
    type: "object",
    properties: {
      total: {
        type: "number",
        example: 100,
        description: "전체 데이터 수",
      },
      page: {
        type: "number",
        example: 1,
        description: "현재 페이지",
      },
      limit: {
        type: "number",
        example: 10,
        description: "페이지당 데이터 수",
      },
      totalPages: {
        type: "number",
        example: 10,
        description: "전체 페이지 수",
      },
    },
    additionalProperties: false,
  })
  readonly meta?: PaginationMeta;

  @ApiProperty({
    description: "응답 타임스탬프",
    example: "2025-06-29T07:54:08.000Z",
  })
  readonly timestamp: string;

  constructor(data: T, message?: string, meta?: PaginationMeta) {
    this.success = true;
    this.data = data;
    this.message = message;
    this.meta = meta;
    this.timestamp = new Date().toISOString();
  }
}
