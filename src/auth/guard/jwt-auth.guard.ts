import { Injectable, ExecutionContext, UnauthorizedException, CanActivate } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { JwtPayload } from "../strategies/jwt.strategy";
import { Request } from "express";
import { InvalidUserException } from "@/common/exceptions/invalid-user.exception";

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException("토큰이 제공되지 않았습니다.");
    }

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token);
      // const user = await this.usersService.findByUuid(payload.sub);

      if (!payload) {
        throw new InvalidUserException();
      }

      request.user = payload;
      return true;
    } catch (error) {
      // 커스텀 예외는 그대로 전달
      if (error instanceof InvalidUserException) {
        throw error;
      }

      throw new UnauthorizedException("유효하지 않은 토큰입니다.");
    }
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(" ") ?? [];
    return type === "Bearer" ? token : undefined;
  }
}
