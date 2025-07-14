// src/common/filters/global-exception.filter.ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
  BadRequestException,
} from "@nestjs/common";
import { Request, Response } from "express";
import { InstooApiResponse } from "../dto/instoo-api-response.dto";
import { ApiErrorCode } from "../constants/api-error.enum";

// 커스텀 API 에러 응답 타입 정의
interface ApiErrorResponse {
  code: ApiErrorCode;
  content: null;
}

// ValidationPipe 에러 응답 타입 정의
interface ValidationErrorResponse {
  message: string[] | string;
  error: string;
  statusCode: number;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status: number;
    let errorCode: ApiErrorCode | null = null;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      // 커스텀 API Exception인지 확인
      if (this.isApiErrorResponse(exceptionResponse)) {
        errorCode = exceptionResponse.code;
      }
      // ValidationPipe 에러인지 확인
      else if (this.isValidationError(exception, exceptionResponse)) {
        errorCode = this.getValidationErrorCode(exceptionResponse);
      }
    } else {
      // 예상치 못한 에러
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      errorCode = "SYSTEM_INTERNAL_ERROR" as ApiErrorCode;
    }

    // 에러 로깅
    this.logError(request, status, errorCode, exception);

    // InstooApiResponse 형식으로 에러 응답 반환
    const errorResponse: InstooApiResponse<null> = errorCode
      ? InstooApiResponse.error(errorCode)
      : InstooApiResponse.error("UNKNOWN_ERROR" as ApiErrorCode);

    response.status(status).json(errorResponse);
  }

  private isApiErrorResponse(obj: unknown): obj is ApiErrorResponse {
    return (
      typeof obj === "object" &&
      obj !== null &&
      "code" in obj &&
      "content" in obj &&
      (obj as Record<string, unknown>).content === null &&
      typeof (obj as Record<string, unknown>).code === "string"
    );
  }

  private isValidationError(
    exception: HttpException,
    response: unknown,
  ): response is ValidationErrorResponse {
    return (
      exception instanceof BadRequestException &&
      typeof response === "object" &&
      response !== null &&
      "message" in response &&
      "error" in response &&
      (response as Record<string, unknown>).error === "Bad Request"
    );
  }

  private getValidationErrorCode(response: ValidationErrorResponse): ApiErrorCode {
    const messages = Array.isArray(response.message) ? response.message : [response.message];

    // UpdateProfileDto 닉네임 validation 에러 매핑
    const errorPatterns = [
      {
        pattern: /닉네임은 문자열이어야 합니다/,
        code: "INVALID_NICKNAME_TYPE" as ApiErrorCode,
      },
      {
        pattern: /닉네임은 2자 이상 8자 이하로 입력해주세요/,
        code: "INVALID_NICKNAME_LENGTH" as ApiErrorCode,
      },
      {
        pattern: /닉네임은 한글, 영문, 숫자만 사용 가능합니다/,
        code: "INVALID_NICKNAME_FORMAT" as ApiErrorCode,
      },
      // 일반적인 validation 에러들
      {
        pattern: /email.*invalid|invalid.*email/i,
        code: "INVALID_EMAIL_FORMAT" as ApiErrorCode,
      },
      {
        pattern: /password.*weak|weak.*password/i,
        code: "WEAK_PASSWORD" as ApiErrorCode,
      },
      {
        pattern: /should not be empty|must not be empty/i,
        code: "REQUIRED_FIELD_MISSING" as ApiErrorCode,
      },
      {
        pattern: /must be.*string/i,
        code: "INVALID_DATA_TYPE" as ApiErrorCode,
      },
      {
        pattern: /must be longer than|must be shorter than/i,
        code: "INVALID_INPUT_LENGTH" as ApiErrorCode,
      },
    ];

    // 첫 번째 매칭되는 패턴 찾기
    for (const message of messages) {
      for (const { pattern, code } of errorPatterns) {
        if (pattern.test(message)) {
          return code;
        }
      }
    }

    // 기본 validation 에러 코드
    return "VALIDATION_ERROR" as ApiErrorCode;
  }

  private logError(
    request: Request,
    status: number,
    errorCode: ApiErrorCode | null,
    exception: unknown,
  ): void {
    const errorMessage = `${request.method} ${request.url} - ${status}: ${errorCode}`;

    if (exception instanceof HttpException) {
      const exceptionResponse = exception.getResponse();

      // ValidationPipe 에러인 경우 더 자세한 로그
      if (this.isValidationError(exception, exceptionResponse)) {
        this.logger.warn(
          `${errorMessage} - Validation failed: ${JSON.stringify(exceptionResponse.message)}`,
        );
      } else {
        this.logger.error(errorMessage, exception.stack);
      }
    } else {
      this.logger.error(
        errorMessage,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }
  }
}
