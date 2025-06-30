// src/common/interceptors/logging.interceptor.ts
import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from "@nestjs/common";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";
import { Request, Response } from "express";

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const now = Date.now();
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const { method, url, ip, headers } = request;
    const userAgent = headers["user-agent"] || "";

    // 요청 로그
    this.logger.log(`[REQUEST] ${method} ${url} - ${ip} - ${userAgent}`);

    return next.handle().pipe(
      tap({
        next: (_data) => {
          const responseTime = Date.now() - now;
          this.logger.log(
            `[RESPONSE] ${method} ${url} - ${response.statusCode} - ${responseTime}ms`,
          );
        },
        error: (error: { status: number; message: string | object }) => {
          const responseTime = Date.now() - now;
          const message =
            typeof error.message === "string" ? error.message : JSON.stringify(error.message);
          this.logger.error(
            `[ERROR] ${method} ${url} - ${error.status || 500} - ${responseTime}ms - ${message}`,
          );
        },
      }),
    );
  }
}
