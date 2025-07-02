import { UnauthorizedException } from "@nestjs/common";

export class InvalidUserException extends UnauthorizedException {
  constructor() {
    super("유효하지 않은 사용자입니다.");
  }
}
