// src/common/decorators/api-response.decorator.ts
import { applyDecorators, Type } from "@nestjs/common";
import { ApiResponse, ApiResponseOptions, getSchemaPath } from "@nestjs/swagger";
import { InstooApiResponse } from "../dto/instoo-api-response.dto";

type DecoratorFunction = (
  target: any,
  propertyKey?: string | symbol,
  descriptor?: TypedPropertyDescriptor<any>,
) => TypedPropertyDescriptor<any> | void;

/**
 * 단일 모델 응답용 데코레이터
 * @example @ApiInstooResponse(UserDto, { status: 200, description: '사용자 정보 조회 성공' })
 */
export const ApiInstooResponse = <TModel>(
  model: Type<TModel>,
  options?: Omit<ApiResponseOptions, "schema">,
) => {
  return applyDecorators(
    ApiResponse({
      ...options,
      schema: {
        type: "object",
        properties: {
          success: {
            type: "boolean",
            description: "응답 성공 여부",
            example: true,
          },
          data: {
            $ref: getSchemaPath(model),
            nullable: true,
            description: "응답 데이터",
          },
          message: {
            type: "string",
            example: "성공적으로 데이터를 추가하였습니다.",
            description: "성공 메시지",
          },
          timestamp: {
            type: "string",
            format: "date-time",
            example: new Date().toISOString(),
            description: "응답 타임스탬프",
          },
        },
      },
    }),
  );
};

/**
 * 배열 응답용 데코레이터
 * @example @ApiInstooArrayResponse(UserDto, { status: 200, description: '사용자 목록 조회 성공' })
 */
export const ApiInstooArrayResponse = <TModel>(
  model: Type<TModel>,
  options?: Omit<ApiResponseOptions, "schema">,
) => {
  return applyDecorators(
    ApiResponse({
      ...options,
      schema: {
        allOf: [
          { $ref: getSchemaPath(InstooApiResponse) },
          {
            properties: {
              data: {
                type: "array",
                items: {
                  $ref: getSchemaPath(model),
                },
              },
            },
          },
        ],
      },
    }),
  );
};

/**
 * 페이지네이션 응답용 데코레이터
 * @example @ApiInstooPageResponse(UserDto, { status: 200, description: '사용자 목록 페이지네이션 조회 성공' })
 */
export const ApiInstooPageResponse = <TModel>(
  model: Type<TModel>,
  options?: Omit<ApiResponseOptions, "schema">,
) => {
  return applyDecorators(
    ApiResponse({
      ...options,
      schema: {
        allOf: [
          { $ref: getSchemaPath(InstooApiResponse) },
          {
            properties: {
              data: {
                type: "array",
                items: {
                  $ref: getSchemaPath(model),
                },
              },
              meta: {
                type: "object",
                properties: {
                  total: {
                    type: "number",
                    description: "전체 아이템 수",
                    example: 100,
                  },
                  page: {
                    type: "number",
                    description: "현재 페이지",
                    example: 1,
                  },
                  limit: {
                    type: "number",
                    description: "페이지당 아이템 수",
                    example: 10,
                  },
                  totalPages: {
                    type: "number",
                    description: "전체 페이지 수",
                    example: 10,
                  },
                },
                required: ["total", "page", "limit", "totalPages"],
                additionalProperties: false,
              },
            },
          },
        ],
      },
    }),
  );
};

/**
 * 에러 응답용 데코레이터
 * @example @ApiInstooErrorResponse(404, '사용자를 찾을 수 없습니다', {
 *   code: 'USER_NOT_FOUND',
 *   message: '해당 ID의 사용자가 존재하지 않습니다',
 *   details: { userId: 123 }
 * })
 */
export const ApiInstooErrorResponse = (
  status: number,
  description: string,
  errorExample: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  },
) => {
  return applyDecorators(
    ApiResponse({
      status,
      description,
      schema: {
        type: "object",
        properties: {
          success: {
            type: "boolean",
            description: "요청 성공 여부",
            example: false,
          },
          data: {
            type: "null",
            description: "응답 데이터 (에러 시 null)",
            example: null,
          },
          message: {
            type: "string",
            nullable: true,
            description: "추가 메시지",
            example: null,
          },
          error: {
            type: "object",
            description: "에러 정보",
            properties: {
              code: {
                type: "string",
                description: "에러 코드",
                example: errorExample.code,
              },
              message: {
                type: "string",
                description: "에러 메시지",
                example: errorExample.message,
              },
              details: {
                type: "object",
                description: "에러 상세 정보",
                additionalProperties: true,
                example: errorExample.details || {},
              },
            },
            required: ["code", "message"],
            additionalProperties: false,
          },
          timestamp: {
            type: "string",
            description: "응답 생성 시간 (ISO 8601)",
            format: "date-time",
            example: new Date().toISOString(),
          },
        },
        required: ["success", "data", "error", "timestamp"],
        additionalProperties: false,
      },
    }),
  );
};

/**
 * 복합 응답 데코레이터 (성공 + 에러 응답을 동시에 적용)
 * @example @ApiInstooResponses(UserDto, {
 *   success: { status: 200, description: '성공' },
 *   errors: [
 *     { status: 404, description: '사용자 없음', code: 'USER_NOT_FOUND', message: '사용자를 찾을 수 없습니다' }
 *   ]
 * })
 */
export const ApiInstooResponses = <TModel>(
  model: Type<TModel>,
  options: {
    success: {
      status: number;
      description: string;
      isArray?: boolean;
      isPaginated?: boolean;
    };
    errors: Array<{
      status: number;
      description: string;
      code: string;
      message: string;
      details?: Record<string, unknown>;
    }>;
  },
) => {
  return (
    target: any,
    propertyKey?: string | symbol,
    descriptor?: TypedPropertyDescriptor<any>,
  ) => {
    // 성공 응답 데코레이터 적용
    let successDecorator: DecoratorFunction;
    if (options.success.isPaginated) {
      successDecorator = ApiInstooPageResponse(model, {
        status: options.success.status,
        description: options.success.description,
      }) as DecoratorFunction;
    } else if (options.success.isArray) {
      successDecorator = ApiInstooArrayResponse(model, {
        status: options.success.status,
        description: options.success.description,
      }) as DecoratorFunction;
    } else {
      successDecorator = ApiInstooResponse(model, {
        status: options.success.status,
        description: options.success.description,
      }) as DecoratorFunction;
    }

    // 성공 응답 적용
    successDecorator(target, propertyKey, descriptor);

    // 에러 응답들 적용
    options.errors.forEach((error) => {
      const errorDecorator = ApiInstooErrorResponse(error.status, error.description, {
        code: error.code,
        message: error.message,
        details: error.details,
      }) as DecoratorFunction;
      errorDecorator(target, propertyKey, descriptor);
    });
  };
};
