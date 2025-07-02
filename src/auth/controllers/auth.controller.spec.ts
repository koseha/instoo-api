import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { Response } from "express";

import { AuthController } from "./auth.controller";
import { AuthService } from "../services/auth.service";
import { OAuthUrlResponseDto, AuthCallbackResponseDto } from "../dto/auth-response.dto";
import { UserInfoDto } from "../../users/dto/user-response.dto"; // 상대 경로 사용
import { UserRole } from "../../common/constants/user-role.enum"; // 상대 경로 사용

describe("AuthController", () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;
  let configService: jest.Mocked<ConfigService>;

  const mockAuthResult: AuthCallbackResponseDto = {
    accessToken: "mock-access-token",
    refreshToken: "mock-refresh-token",
    user: {
      uuid: "test-uuid",
      email: "test@example.com",
      nickname: "Test User",
      role: UserRole.USER,
      isActive: true,
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
    } as UserInfoDto,
    expiresAt: "2024-01-08T00:00:00.000Z",
  };

  beforeEach(async () => {
    // console 메서드 모킹 (테스트 출력 깔끔하게)
    jest.spyOn(console, "error").mockImplementation(() => undefined);
    jest.spyOn(console, "log").mockImplementation(() => undefined);

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            generateGoogleOAuthUrl: jest.fn(),
            processGoogleAuth: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
    configService = module.get(ConfigService);

    configService.get.mockImplementation((key: string) => {
      const config: Record<string, string> = {
        FRONTEND_SUCCESS_URL: "http://localhost:3000/test/success",
        FRONTEND_ERROR_URL: "http://localhost:3000/test/error",
      };
      return config[key];
    });
  });

  afterEach(() => {
    // console 모킹 복원
    jest.restoreAllMocks();
  });

  describe("getGoogleLoginUrl", () => {
    it("Google OAuth URL을 성공적으로 반환해야 한다", () => {
      const mockUrl = "https://accounts.google.com/o/oauth2/v2/auth?client_id=test";

      // this 바인딩 문제 없이 mock 처리
      const spy = jest.spyOn(authService, "generateGoogleOAuthUrl").mockReturnValue(mockUrl);

      const result = controller.getGoogleLoginUrl();
      expect(spy).toHaveBeenCalled();
      expect(result.code).toBe(200);
      expect(result.content).not.toBeNull();
      expect(result.content).toBeInstanceOf(OAuthUrlResponseDto);
      expect(result.content!.oauthUrl).toBe(mockUrl);
      expect(result.message).toBe("Google OAuth URL이 성공적으로 생성되었습니다.");
    });
  });

  describe("googleCallback", () => {
    let mockResponse: jest.Mocked<Response>;

    beforeEach(() => {
      // redirect는 void를 반환하므로 반환값 없이 설정
      mockResponse = {
        redirect: jest.fn(),
      } as unknown as jest.Mocked<Response>;
    });

    it("성공적인 OAuth 콜백을 처리하고 프론트엔드로 리다이렉트해야 한다", async () => {
      const processGoogleAuthMock = jest.spyOn(authService, "processGoogleAuth");

      processGoogleAuthMock.mockResolvedValue(mockAuthResult);

      await controller.googleCallback("auth-code", "state", mockResponse);

      expect(processGoogleAuthMock).toHaveBeenCalledWith("auth-code", "state");

      // redirect가 한 번만 호출되었는지 확인
      const redirectSpy = jest.spyOn(mockResponse, "redirect");
      expect(redirectSpy).toHaveBeenCalledTimes(1);

      // 호출된 URL 확인
      const redirectUrl = redirectSpy.mock.calls[0][0];
      expect(redirectUrl).toContain("http://localhost:3000/test/success");
      expect(redirectUrl).toContain("token=mock-access-token");
      expect(redirectUrl).toContain("refresh_token=mock-refresh-token");
      expect(redirectUrl).toContain("user_uuid=test-uuid");
    });

    it("OAuth 에러가 있는 경우 에러 페이지로 리다이렉트해야 한다", async () => {
      await controller.googleCallback("", "state", mockResponse, "access_denied");

      const redirectSpy2 = jest.spyOn(mockResponse, "redirect");
      expect(redirectSpy2).toHaveBeenCalledTimes(1);
      expect(redirectSpy2).toHaveBeenCalledWith(
        "http://localhost:3000/test/error?error=access_denied&message=" +
          encodeURIComponent("OAuth 인증이 거부되었습니다."),
      );
    });

    it("인증 코드가 없는 경우 에러 페이지로 리다이렉트해야 한다", async () => {
      await controller.googleCallback("", "state", mockResponse);

      const redirectSpy3 = jest.spyOn(mockResponse, "redirect");
      expect(redirectSpy3).toHaveBeenCalledTimes(1);
      expect(redirectSpy3).toHaveBeenCalledWith(
        "http://localhost:3000/test/error?error=missing_code&message=" +
          encodeURIComponent("인증 코드가 누락되었습니다."),
      );
    });

    it("Auth 서비스에서 에러가 발생한 경우 에러 페이지로 리다이렉트해야 한다", async () => {
      const error = new Error("token_exchange_failed");
      authService.processGoogleAuth.mockRejectedValue(error);

      await controller.googleCallback("invalid-code", "state", mockResponse);

      const redirectSpy4 = jest.spyOn(mockResponse, "redirect");
      expect(redirectSpy4).toHaveBeenCalledTimes(1);
      expect(redirectSpy4).toHaveBeenCalledWith(
        "http://localhost:3000/test/error?error=token_exchange_failed&message=" +
          encodeURIComponent("토큰 교환에 실패했습니다."),
      );
    });

    it("user_not_found 에러 시 적절한 에러 메시지로 리다이렉트해야 한다", async () => {
      const error = new Error("user_not_found: 사용자를 찾을 수 없음");
      authService.processGoogleAuth.mockRejectedValue(error);

      await controller.googleCallback("auth-code", "state", mockResponse);

      const redirectSpy5 = jest.spyOn(mockResponse, "redirect");
      expect(redirectSpy5).toHaveBeenCalledTimes(1);
      expect(redirectSpy5).toHaveBeenCalledWith(
        "http://localhost:3000/test/error?error=user_not_found&message=" +
          encodeURIComponent("사용자 정보를 찾을 수 없습니다."),
      );
    });

    it("invalid_state 에러 시 적절한 에러 메시지로 리다이렉트해야 한다", async () => {
      const error = new Error("invalid_state: 잘못된 상태값");
      authService.processGoogleAuth.mockRejectedValue(error);

      await controller.googleCallback("auth-code", "state", mockResponse);

      const redirectSpy6 = jest.spyOn(mockResponse, "redirect");
      expect(redirectSpy6).toHaveBeenCalledTimes(1);
      expect(redirectSpy6).toHaveBeenCalledWith(
        "http://localhost:3000/test/error?error=invalid_state&message=" +
          encodeURIComponent("유효하지 않은 요청입니다."),
      );
    });
  });
});
