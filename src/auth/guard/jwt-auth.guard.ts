import { Injectable, ExecutionContext, UnauthorizedException } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { Reflector } from "@nestjs/core";
import { User } from "@/users/entities/user.entity";

@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
  constructor(private reflector: Reflector) {
    super();
  }

  /**
   * 인증 여부를 판단하는 메서드.
   * - @Public() 데코레이터가 붙은 핸들러인 경우 인증을 건너뜀.
   * - 그 외의 경우 passport-jwt 전략을 이용한 인증 수행.
   */
  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>("isPublic", [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    return super.canActivate(context);
  }

  /**
   * passport 인증 전략 실행 후 호출되는 메서드.
   * - 인증 에러가 있거나 user 객체가 없으면 UnauthorizedException 예외 발생.
   * - 정상 인증된 경우 user 객체를 반환하여 request.user로 주입됨.
   *
   * 시그니처는 passport 내부 AuthGuard 구현과 호환되도록 맞춰야 함.
   */
  handleRequest<TUser = User>(
    err: any,
    user: any,
    _info: any,
    _context: ExecutionContext,
    _status?: any,
  ): TUser {
    if (err || !user) {
      throw err || new UnauthorizedException("인증이 필요합니다.");
    }
    return user as TUser;
  }
}
