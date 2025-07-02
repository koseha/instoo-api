import { Injectable, ExecutionContext, UnauthorizedException, CanActivate } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { UsersService } from "@/users/users.service";
import { JwtPayload } from "../strategies/jwt.strategy";
import { User } from "@/users/entities/user.entity";
import { Request } from "express";

export interface AuthenticatedRequest extends Request {
  user?: User;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException("토큰이 제공되지 않았습니다.");
    }

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token);
      const user = await this.usersService.findByUuid(payload.sub);

      if (!user) {
        throw new UnauthorizedException("유효하지 않은 사용자입니다.");
      }

      request.user = user;
      return true;
    } catch {
      throw new UnauthorizedException("유효하지 않은 토큰입니다.");
    }
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(" ") ?? [];
    return type === "Bearer" ? token : undefined;
  }
}
