// src/common/exceptions/api-exceptions.ts
import {
  BadRequestException,
  NotFoundException,
  ConflictException,
  UnauthorizedException,
  ForbiddenException,
  InternalServerErrorException,
} from "@nestjs/common";
import { ApiErrorCode } from "../constants/api-error.enum";

// 기본 커스텀 Exception 클래스들
export class ApiException extends BadRequestException {
  constructor(errorCode: ApiErrorCode) {
    super({ code: errorCode, content: null });
  }
}

export class ApiNotFoundException extends NotFoundException {
  constructor(errorCode: ApiErrorCode) {
    super({ code: errorCode, content: null });
  }
}

export class ApiConflictException extends ConflictException {
  constructor(errorCode: ApiErrorCode) {
    super({ code: errorCode, content: null });
  }
}

export class ApiUnauthorizedException extends UnauthorizedException {
  constructor(errorCode: ApiErrorCode) {
    super({ code: errorCode, content: null });
  }
}

export class ApiForbiddenException extends ForbiddenException {
  constructor(errorCode: ApiErrorCode) {
    super({ code: errorCode, content: null });
  }
}

export class ApiInternalServerException extends InternalServerErrorException {
  constructor(errorCode: ApiErrorCode) {
    super({ code: errorCode, content: null });
  }
}
