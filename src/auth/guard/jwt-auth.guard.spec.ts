import { ExecutionContext, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Test, TestingModule } from "@nestjs/testing";

import { AuthenticatedRequest, JwtAuthGuard } from "./jwt-auth.guard";
import { JwtPayload } from "../strategies/jwt.strategy";
import { UserRole } from "../../common/constants/user-role.enum"; // 상대 경로 사용
import { IncomingHttpHeaders } from "http";

describe("JwtAuthGuard", () => {
  let guard: JwtAuthGuard;
  let jwtService: jest.Mocked<JwtService>;

  let mockRequest: AuthenticatedRequest;

  const mockExecutionContext: ExecutionContext = {
    switchToHttp: () => ({
      getRequest: () => mockRequest,
    }),
  } as unknown as ExecutionContext;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtAuthGuard,
        {
          provide: JwtService,
          useValue: {
            verifyAsync: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<JwtAuthGuard>(JwtAuthGuard);
    jwtService = module.get(JwtService);

    mockRequest = {
      headers: {} as IncomingHttpHeaders,
      user: undefined,
    } as AuthenticatedRequest;
  });

  it("유효한 JWT 토큰으로 인증을 성공하고 사용자 정보를 주입해야 한다", async () => {
    const mockPayload: JwtPayload = {
      sub: "test-uuid",
      nickname: "Test User",
      role: UserRole.USER,
    };

    const verifyAsyncMock = jest.spyOn(jwtService, "verifyAsync");
    verifyAsyncMock.mockResolvedValue(mockPayload);

    mockRequest.headers.authorization = "Bearer valid-token";

    const result = await guard.canActivate(mockExecutionContext);

    expect(result).toBe(true);
    expect(mockRequest.user).toEqual(mockPayload);
    expect(verifyAsyncMock).toHaveBeenCalledWith("valid-token");
  });

  it("토큰이 없는 경우 UnauthorizedException을 발생시켜야 한다", async () => {
    await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
      new UnauthorizedException("토큰이 제공되지 않았습니다."),
    );
  });

  it("잘못된 형식의 Authorization 헤더인 경우 UnauthorizedException을 발생시켜야 한다", async () => {
    mockRequest.headers.authorization = "Basic invalid-format";

    await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
      new UnauthorizedException("토큰이 제공되지 않았습니다."),
    );
  });

  it("Bearer 타입이 아닌 토큰인 경우 UnauthorizedException을 발생시켜야 한다", async () => {
    mockRequest.headers.authorization = "Token some-token";

    await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
      new UnauthorizedException("토큰이 제공되지 않았습니다."),
    );
  });

  it("유효하지 않은 JWT 토큰인 경우 UnauthorizedException을 발생시켜야 한다", async () => {
    mockRequest.headers.authorization = "Bearer invalid-token";
    jwtService.verifyAsync.mockRejectedValue(new Error("Invalid token"));

    await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
      new UnauthorizedException("유효하지 않은 토큰입니다."),
    );
  });

  it("JWT 검증 시 null 페이로드가 반환되는 경우 UnauthorizedException을 발생시켜야 한다", async () => {
    const verifyAsyncMock = jest.spyOn(jwtService, "verifyAsync");

    // 타입 오류 방지: as unknown as JwtPayload (명시적으로 undefined나 null 대응)
    verifyAsyncMock.mockResolvedValue(null as unknown as JwtPayload);

    mockRequest.headers.authorization = "Bearer token-with-null-payload";

    await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
      new UnauthorizedException("유효하지 않은 사용자입니다."),
    );

    expect(verifyAsyncMock).toHaveBeenCalledWith("token-with-null-payload");
  });
});
