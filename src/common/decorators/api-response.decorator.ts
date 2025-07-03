import { applyDecorators, Type } from "@nestjs/common";
import { ApiResponse, ApiExtraModels, getSchemaPath } from "@nestjs/swagger";
import { InstooApiResponse, PagedResponse } from "../dto/instoo-api-response.dto";

// 옵션 인터페이스들
interface ApiInstooResponseOptions {
  status?: number;
  description: string;
}

interface ApiInstooErrorOptions {
  code: string;
  message: string;
}

interface ApiInstooErrorResponseOptions extends ApiInstooErrorOptions {
  status?: number;
  description?: string;
}

interface ApiInstooResponsesOptions {
  success: ApiInstooResponseOptions;
  errors?: ApiInstooErrorResponseOptions[];
}

/**
 * InstooApiResponse 성공 응답 데코레이터 (배열 지원)
 */
export function ApiInstooResponse<T>(
  dataType: Type<T>,
  options: ApiInstooResponseOptions & { isArray?: boolean },
) {
  const { status = 200, description, isArray = false } = options;

  return applyDecorators(
    ApiExtraModels(InstooApiResponse, dataType),
    ApiResponse({
      status,
      description,
      schema: {
        type: "object",
        properties: {
          code: {
            type: "number",
            example: status,
            description: "HTTP 상태 코드",
          },
          message: {
            type: "string",
            example: description,
            description: "응답 메시지",
            nullable: true,
          },
          content: isArray
            ? {
                type: "array",
                items: { $ref: getSchemaPath(dataType) },
                description: "응답 본문 (배열)",
              }
            : {
                $ref: getSchemaPath(dataType),
                description: "응답 본문",
              },
        },
        required: ["code", "message", "content"],
      },
    }),
  );
}

/**
 * InstooApiResponse 배열 응답 전용 데코레이터
 */
export function ApiInstooArrayResponse<T>(dataType: Type<T>, options: ApiInstooResponseOptions) {
  const { status = 200, description } = options;

  return applyDecorators(
    ApiExtraModels(InstooApiResponse, dataType),
    ApiResponse({
      status,
      description,
      schema: {
        type: "object",
        properties: {
          code: {
            type: "number",
            example: status,
            description: "HTTP 상태 코드",
          },
          message: {
            type: "string",
            example: description,
            description: "응답 메시지",
            nullable: true,
          },
          content: {
            type: "array",
            items: { $ref: getSchemaPath(dataType) },
            description: "응답 본문 (배열)",
          },
        },
        required: ["code", "message", "content"],
      },
    }),
  );
}

/**
 * InstooApiResponse 에러 응답 데코레이터
 */
export function ApiInstooErrorResponse(
  status: number,
  description: string,
  errorExample: ApiInstooErrorOptions,
) {
  return applyDecorators(
    ApiExtraModels(InstooApiResponse),
    ApiResponse({
      status,
      description,
      schema: {
        type: "object",
        properties: {
          code: {
            type: "number",
            example: status,
            description: "HTTP 상태 코드",
          },
          message: {
            type: "string",
            example: errorExample.message,
            description: "에러 메시지",
          },
          content: {
            type: "null",
            example: null,
            description: "응답 본문 (에러 시 null)",
          },
        },
        required: ["code", "message", "content"],
      },
    }),
  );
}

/**
 * InstooApiResponse 성공 + 에러 응답들을 조합한 데코레이터 (배열 지원)
 */
export function ApiInstooResponses<T>(
  dataType: Type<T>,
  options: ApiInstooResponsesOptions & { isArray?: boolean },
) {
  const { success, errors = [], isArray = false } = options;

  const decorators = [ApiInstooResponse(dataType, { ...success, isArray })];

  // 에러 응답들 추가
  errors.forEach((error) => {
    decorators.push(
      ApiInstooErrorResponse(error.status || 400, error.description || error.message, {
        code: error.code,
        message: error.message,
      }),
    );
  });

  return applyDecorators(...decorators);
}

/**
 * InstooApiResponse 페이지네이션 응답 데코레이터
 */
export function ApiInstooPagedResponse<T>(dataType: Type<T>, options: ApiInstooResponseOptions) {
  const { status = 200, description } = options;

  return applyDecorators(
    ApiExtraModels(InstooApiResponse, PagedResponse, dataType),
    ApiResponse({
      status,
      description,
      schema: {
        type: "object",
        properties: {
          code: {
            type: "number",
            example: status,
            description: "HTTP 상태 코드",
          },
          message: {
            type: "string",
            example: description,
            description: "응답 메시지",
            nullable: true,
          },
          content: {
            type: "object",
            properties: {
              size: {
                type: "number",
                example: 20,
                description: "페이지 크기",
              },
              page: {
                type: "object",
                properties: {
                  next: {
                    type: "object",
                    properties: {
                      concurrentUserCount: { type: "number" },
                      liveId: { type: "number" },
                    },
                    nullable: true,
                  },
                },
              },
              data: {
                type: "array",
                items: { $ref: getSchemaPath(dataType) },
                description: "데이터 배열",
              },
            },
            required: ["size", "page", "data"],
          },
        },
        required: ["code", "message", "content"],
      },
    }),
  );
}

/**
 * InstooApiResponse 단순 성공 응답 (content 없음)
 */
export function ApiInstooSimpleResponse(options: ApiInstooResponseOptions) {
  const { status = 200, description } = options;

  return applyDecorators(
    ApiExtraModels(InstooApiResponse),
    ApiResponse({
      status,
      description,
      schema: {
        type: "object",
        properties: {
          code: {
            type: "number",
            example: status,
            description: "HTTP 상태 코드",
          },
          message: {
            type: "string",
            example: description,
            description: "응답 메시지",
          },
          content: {
            type: "null",
            example: null,
            description: "응답 본문 (없음)",
          },
        },
        required: ["code", "message", "content"],
      },
    }),
  );
}

/**
 * InstooApiResponse 성공 + 에러 응답들을 조합한 데코레이터 (응답 본문 없음)
 */
export function ApiInstooSimpleResponses(options: {
  success: ApiInstooResponseOptions;
  errors?: ApiInstooErrorResponseOptions[];
}) {
  const { success, errors = [] } = options;

  const decorators = [ApiInstooSimpleResponse(success)];

  // 에러 응답들 추가
  errors.forEach((error) => {
    decorators.push(
      ApiInstooErrorResponse(error.status || 400, error.description || error.message, {
        code: error.code,
        message: error.message,
      }),
    );
  });

  return applyDecorators(...decorators);
}
