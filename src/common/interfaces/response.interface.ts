// src/common/interfaces/response.interface.ts
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

// 타입 안전성을 위한 응답 타입들
export interface SuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
  meta?: PaginationMeta;
  timestamp: string;
  error?: never;
}

export interface ErrorResponse {
  success: false;
  data?: never;
  message?: string;
  error: ApiError;
  timestamp: string;
  meta?: never;
}
