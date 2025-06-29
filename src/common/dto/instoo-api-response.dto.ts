// src/common/dto/common-response.dto.ts
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class InstooApiResponse<T = unknown> {
  @ApiProperty({
    description: "응답 성공 여부",
    example: true,
  })
  readonly success: boolean;

  @ApiPropertyOptional({
    description: "응답 데이터",
    nullable: true,
  })
  readonly data?: T;

  @ApiPropertyOptional({
    description: "응답 메시지",
    example: "요청이 성공적으로 처리되었습니다.",
  })
  readonly message?: string;

  @ApiPropertyOptional({
    description: "에러 정보 (실패 시)",
    type: "object",
    properties: {
      code: {
        type: "string",
        example: "USER_NOT_FOUND",
      },
      message: {
        type: "string",
        example: "사용자를 찾을 수 없습니다.",
      },
      details: {
        type: "object",
        additionalProperties: true,
        example: { userId: "123" },
      },
    },
    additionalProperties: false,
  })
  readonly error?: ApiError;

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

  constructor(
    success: boolean,
    data?: T,
    message?: string,
    error?: ApiError,
    meta?: PaginationMeta,
  ) {
    this.success = success;
    this.data = data;
    this.message = message;
    this.error = error;
    this.meta = meta;
    this.timestamp = new Date().toISOString();
  }

  static success<T>(data: T, message?: string, meta?: PaginationMeta): InstooApiResponse<T> {
    return new InstooApiResponse(true, data, message, undefined, meta);
  }

  static error(
    code: string,
    message: string,
    details?: Record<string, unknown>,
  ): InstooApiResponse<null> {
    return new InstooApiResponse(false, null, undefined, { code, message, details });
  }

  static paginated<T>(
    data: T[],
    total: number,
    page: number,
    limit: number,
    message?: string,
  ): InstooApiResponse<T[]> {
    const totalPages = Math.ceil(total / limit);
    const meta: PaginationMeta = {
      total,
      page,
      limit,
      totalPages,
    };
    return new InstooApiResponse(true, data, message, undefined, meta);
  }
}

// 사용 예시를 위한 타입들
export interface SuccessResponse<T> extends InstooApiResponse<T> {
  success: true;
  data: T;
  error?: never;
}

export interface ErrorResponse extends InstooApiResponse<never> {
  success: false;
  data?: never;
  error: ApiError;
}

// 유틸리티 타입 가드 함수들
export function isSuccessResponse<T>(
  response: InstooApiResponse<T>,
): response is SuccessResponse<T> {
  return response.success === true;
}

export function isErrorResponse<T>(response: InstooApiResponse<T>): response is ErrorResponse {
  return response.success === false;
}
