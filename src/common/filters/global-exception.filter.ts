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

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status: number;
    let message: string;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse: any = exception.getResponse();

      if (typeof exceptionResponse === "string") {
        message = exceptionResponse;
      } else if (this.isErrorResponseObject(exceptionResponse)) {
        message = exceptionResponse.message || exception.message;
      } else {
        message = exception.message;
      }
    } else {
      // 예상치 못한 에러
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = "Internal server error occurred";
    }

    // 에러 로깅
    this.logger.error(
      `${request.method} ${request.url} - ${status}: ${message}`,
      exception instanceof Error ? exception.stack : String(exception),
    );

    // InstooApiResponse 형식으로 에러 응답 반환
    const errorResponse: InstooApiResponse<null> = InstooApiResponse.error(message, status);

    response.status(status).json(errorResponse);
  }

  private isErrorResponseObject(obj: any): obj is { message?: string } {
    return typeof obj === "object" && obj !== null;
  }
}
