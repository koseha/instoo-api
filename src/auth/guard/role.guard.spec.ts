import { Test, TestingModule } from "@nestjs/testing";
import { Reflector } from "@nestjs/core";
import { ExecutionContext, ForbiddenException } from "@nestjs/common";
import { UserRole } from "@/common/constants/user-role.enum";
import { AuthenticatedRequest } from "./jwt-auth.guard";
import { JwtPayload } from "../strategies/jwt.strategy";
import { RolesGuard } from "./role.guard";

describe("RolesGuard", () => {
  let guard: RolesGuard;
  let reflector: jest.Mocked<Reflector>;
  let mockExecutionContext: jest.Mocked<ExecutionContext>;
  let mockRequest: AuthenticatedRequest;
  let getRequestMock: jest.Mock;
  let getAllAndOverrideMock: jest.Mock;

  beforeEach(async () => {
    // Reflector 모킹
    getAllAndOverrideMock = jest.fn();
    reflector = {
      getAllAndOverride: getAllAndOverrideMock,
    } as unknown as jest.Mocked<Reflector>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesGuard,
        {
          provide: Reflector,
          useValue: reflector,
        },
      ],
    }).compile();

    guard = module.get<RolesGuard>(RolesGuard);

    // Request 모킹
    mockRequest = {
      user: undefined,
    } as AuthenticatedRequest;

    // ExecutionContext 모킹
    getRequestMock = jest.fn().mockReturnValue(mockRequest);
    mockExecutionContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: getRequestMock,
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as unknown as jest.Mocked<ExecutionContext>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("canActivate", () => {
    it("역할 요구사항이 없으면 true를 반환해야 한다", () => {
      // Arrange
      getAllAndOverrideMock.mockReturnValue(undefined);

      // Act
      const result = guard.canActivate(mockExecutionContext);

      // Assert
      expect(result).toBe(true);
      expect(getAllAndOverrideMock).toHaveBeenCalledWith("roles", [
        mockExecutionContext.getHandler(),
        mockExecutionContext.getClass(),
      ]);
    });

    it("사용자 정보가 없으면 ForbiddenException을 발생시켜야 한다", () => {
      // Arrange
      getAllAndOverrideMock.mockReturnValue([UserRole.ADMIN]);
      mockRequest.user = undefined;

      // Act & Assert
      expect(() => guard.canActivate(mockExecutionContext)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(mockExecutionContext)).toThrow("사용자 정보가 없습니다.");
    });

    it("사용자가 필요한 역할을 가지고 있으면 true를 반환해야 한다", () => {
      // Arrange
      const userPayload: JwtPayload = {
        sub: "test-uuid",
        nickname: "testuser",
        role: UserRole.ADMIN,
        iat: 1234567890,
        exp: 1234567890,
      };
      mockRequest.user = userPayload;
      getAllAndOverrideMock.mockReturnValue([UserRole.ADMIN, UserRole.USER]);

      // Act
      const result = guard.canActivate(mockExecutionContext);

      // Assert
      expect(result).toBe(true);
    });

    it("사용자가 필요한 역할을 가지고 있지 않으면 ForbiddenException을 발생시켜야 한다", () => {
      // Arrange
      const userPayload: JwtPayload = {
        sub: "test-uuid",
        nickname: "testuser",
        role: UserRole.USER,
        iat: 1234567890,
        exp: 1234567890,
      };
      mockRequest.user = userPayload;
      getAllAndOverrideMock.mockReturnValue([UserRole.ADMIN]);

      // Act & Assert
      expect(() => guard.canActivate(mockExecutionContext)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(mockExecutionContext)).toThrow("접근 권한이 없습니다.");
    });

    it("사용자가 여러 필요 역할 중 하나를 가지고 있으면 true를 반환해야 한다", () => {
      // Arrange
      const userPayload: JwtPayload = {
        sub: "test-uuid",
        nickname: "testuser",
        role: UserRole.USER,
        iat: 1234567890,
        exp: 1234567890,
      };
      mockRequest.user = userPayload;
      getAllAndOverrideMock.mockReturnValue([UserRole.ADMIN, UserRole.USER]);

      // Act
      const result = guard.canActivate(mockExecutionContext);

      // Assert
      expect(result).toBe(true);
    });

    it("getAllAndOverride가 빈 배열을 반환하면 true를 반환해야 한다", () => {
      // Arrange
      const userPayload: JwtPayload = {
        sub: "test-uuid",
        nickname: "testuser",
        role: UserRole.USER,
        iat: 1234567890,
        exp: 1234567890,
      };
      mockRequest.user = userPayload;
      getAllAndOverrideMock.mockReturnValue([]);

      // Act
      const result = guard.canActivate(mockExecutionContext);

      // Assert
      expect(result).toBe(true);
    });

    it("USER 역할을 가진 사용자가 ADMIN 역할이 필요한 경우 접근이 거부되어야 한다", () => {
      // Arrange
      const userPayload: JwtPayload = {
        sub: "test-uuid",
        nickname: "testuser",
        role: UserRole.USER,
        iat: 1234567890,
        exp: 1234567890,
      };
      mockRequest.user = userPayload;
      getAllAndOverrideMock.mockReturnValue([UserRole.ADMIN]);

      // Act & Assert
      expect(() => guard.canActivate(mockExecutionContext)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(mockExecutionContext)).toThrow("접근 권한이 없습니다.");
    });
  });

  describe("Reflector 상호작용", () => {
    it("getAllAndOverride를 올바른 파라미터로 호출해야 한다", () => {
      // Arrange
      getAllAndOverrideMock.mockReturnValue(undefined);
      const mockHandler = jest.fn();
      const mockClass = jest.fn();
      mockExecutionContext.getHandler.mockReturnValue(mockHandler);
      mockExecutionContext.getClass.mockReturnValue(mockClass);

      // Act
      guard.canActivate(mockExecutionContext);

      // Assert
      expect(getAllAndOverrideMock).toHaveBeenCalledWith("roles", [mockHandler, mockClass]);
    });
  });
});
