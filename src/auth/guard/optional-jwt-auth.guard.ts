import { Injectable, ExecutionContext, CanActivate } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { JwtPayload } from "../strategies/jwt.strategy";
import { Request } from "express";

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

@Injectable()
export class OptionalJwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractTokenFromHeader(request);

    // 토큰이 없으면 그냥 통과 (비회원)
    if (!token) {
      request.user = undefined;
      return true;
    }

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: process.env.JWT_SECRET,
      });

      if (payload) {
        request.user = payload;
      } else {
        request.user = undefined;
      }

      return true;
    } catch (error) {
      // 토큰이 유효하지 않아도 통과시킴 (비회원으로 처리)
      request.user = undefined;
      return true;
    }
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(" ") ?? [];
    return type === "Bearer" ? token : undefined;
  }
}
