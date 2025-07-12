// src/common/filters/global-exception.filter.ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Request, Response } from "express";
import { InstooApiResponse } from "../dto/instoo-api-response.dto";
import { ApiErrorCode } from "../constants/api-error.enum";

// 커스텀 API 에러 응답 타입 정의
interface ApiErrorResponse {
  code: ApiErrorCode;
  content: null;
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
    } else {
      // 예상치 못한 에러
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      errorCode = "SYSTEM_INTERNAL_ERROR" as ApiErrorCode;
    }

    // 에러 로깅
    this.logger.error(
      `${request.method} ${request.url} - ${status}: ${errorCode}`,
      exception instanceof Error ? exception.stack : String(exception),
    );

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
}
