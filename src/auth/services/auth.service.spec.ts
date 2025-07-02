import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { Repository } from "typeorm";
import { getRepositoryToken } from "@nestjs/typeorm";
import {
  UnauthorizedException,
  BadRequestException,
  InternalServerErrorException,
} from "@nestjs/common";
import axios from "axios";

import { AuthService } from "./auth.service";
import { User } from "@/users/entities/user.entity";
import { AuthCallbackResponseDto } from "../dto/auth-response.dto";
import { UserInfoDto } from "@/users/dto/user-response.dto";
import { OAuthProvider } from "@/common/constants/oauth-provider.enum";
import { UserRole } from "@/common/constants/user-role.enum";
import { JwtPayload } from "../strategies/jwt.strategy";

// axios 모킹
jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("AuthService", () => {
  let service: AuthService;
  let userRepository: jest.Mocked<Repository<User>>;
  let configService: jest.Mocked<ConfigService>;
  let jwtService: jest.Mocked<JwtService>;

  // 테스트용 모킹 데이터
  const mockUser: User = {
    id: 1,
    uuid: "test-uuid-123",
    email: "test@example.com",
    nickname: "Test User",
    profileImageUrl: "https://example.com/profile.jpg",
    provider: OAuthProvider.GOOGLE,
    providerId: "google-123",
    role: UserRole.USER,
    isActive: true,
    createdAt: new Date("2024-01-01T00:00:00.000Z"),
    updatedAt: new Date("2024-01-01T00:00:00.000Z"),
  } as User;

  const mockGoogleTokenResponse = {
    access_token: "mock-google-access-token",
    refresh_token: "mock-google-refresh-token",
    expires_in: 3600,
    token_type: "Bearer",
    scope: "openid email profile",
  };

  const mockGoogleUserInfo = {
    id: "google-123",
    email: "test@example.com",
    verified_email: true,
    name: "Test User",
    given_name: "Test",
    family_name: "User",
    picture: "https://example.com/profile.jpg",
    locale: "ko",
  };

  const mockJwtTokens = {
    accessToken: "mock-jwt-access-token",
    refreshToken: "mock-jwt-refresh-token",
    expiresAt: "2024-01-08T00:00:00.000Z",
  };

  beforeEach(async () => {
    // console 메서드 모킹
    jest.spyOn(console, "error").mockImplementation(() => undefined);
    jest.spyOn(console, "log").mockImplementation(() => undefined);

    // ConfigService 모킹을 미리 생성
    const mockConfigService = {
      get: jest.fn((key: string, defaultValue?: unknown): string | undefined => {
        const config: Record<string, string> = {
          GOOGLE_CLIENT_ID: "mock-client-id",
          GOOGLE_CLIENT_SECRET: "mock-client-secret",
          GOOGLE_CALLBACK_URL: "http://localhost:3000/auth/google/callback",
          JWT_SECRET: "mock-jwt-secret",
          JWT_EXPIRES_IN: "7d",
        };
        return config[key] ?? (defaultValue as string | undefined);
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: mockConfigService, // 미리 생성된 모킹 객체 사용
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
            verify: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepository = module.get(getRepositoryToken(User));
    configService = module.get(ConfigService);
    jwtService = module.get(JwtService);

    // 이 부분은 제거 (이미 위에서 설정됨)
    // configService.get.mockImplementation(...)

    // axios 기본 모킹
    jest.spyOn(axios, "isAxiosError").mockImplementation((payload: any): payload is Error => false);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  describe("generateGoogleOAuthUrl", () => {
    it("올바른 Google OAuth URL을 생성해야 한다", () => {
      const url = service.generateGoogleOAuthUrl();
      const urlObj = new URL(url);

      expect(urlObj.origin + urlObj.pathname).toBe("https://accounts.google.com/o/oauth2/v2/auth");
      expect(urlObj.searchParams.get("client_id")).toBe("mock-client-id");
      expect(urlObj.searchParams.get("redirect_uri")).toBe(
        "http://localhost:3000/auth/google/callback",
      );
      expect(urlObj.searchParams.get("response_type")).toBe("code");
      expect(urlObj.searchParams.get("scope")).toBe("openid email profile");
      expect(urlObj.searchParams.get("access_type")).toBe("offline");
      expect(urlObj.searchParams.get("prompt")).toBe("consent");
      expect(urlObj.searchParams.get("state")).toBeTruthy();
    });

    it("매번 다른 state 값을 생성해야 한다", () => {
      const url1 = service.generateGoogleOAuthUrl();
      const url2 = service.generateGoogleOAuthUrl();

      const state1 = new URL(url1).searchParams.get("state");
      const state2 = new URL(url2).searchParams.get("state");

      expect(state1).not.toBe(state2);
      expect(state1).toMatch(/^[a-z0-9]+$/); // 영문자와 숫자로만 구성
      expect(state2).toMatch(/^[a-z0-9]+$/);
      expect(state1!.length).toBeGreaterThan(10); // 최소 길이 확인
      expect(state2!.length).toBeGreaterThan(10);
    });
  });

  describe("processGoogleAuth", () => {
    beforeEach(() => {
      // JWT 토큰 생성 모킹
      jwtService.sign.mockImplementation((payload, options?) => {
        if (options?.expiresIn === "30d") {
          return mockJwtTokens.refreshToken;
        }
        return mockJwtTokens.accessToken;
      });
    });

    it("새로운 사용자로 성공적인 OAuth 처리를 해야 한다", async () => {
      // Google API 호출 모킹
      mockedAxios.post.mockResolvedValueOnce({ data: mockGoogleTokenResponse });
      mockedAxios.get.mockResolvedValueOnce({ data: mockGoogleUserInfo });

      // 사용자 없음 -> 새로 생성
      userRepository.findOne.mockResolvedValueOnce(null);
      userRepository.create.mockReturnValueOnce(mockUser);
      userRepository.save.mockResolvedValueOnce(mockUser);

      const result = await service.processGoogleAuth("auth-code", "state");

      expect(jest.spyOn(mockedAxios, "post")).toHaveBeenCalledWith(
        "https://oauth2.googleapis.com/token",
        expect.objectContaining({
          client_id: "mock-client-id",
          client_secret: "mock-client-secret",
          code: "auth-code",
          grant_type: "authorization_code",
          redirect_uri: "http://localhost:3000/auth/google/callback",
        }),
        expect.objectContaining({
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        }),
      );

      expect(jest.spyOn(mockedAxios, "get")).toHaveBeenCalledWith(
        "https://www.googleapis.com/oauth2/v2/userinfo",
        expect.objectContaining({
          headers: { Authorization: "Bearer mock-google-access-token" },
        }),
      );

      expect(jest.spyOn(userRepository, "findOne")).toHaveBeenCalledWith({
        where: [
          { providerId: "google-123", provider: OAuthProvider.GOOGLE },
          { email: "test@example.com" },
        ],
      });

      expect(jest.spyOn(userRepository, "create")).toHaveBeenCalledWith({
        email: "test@example.com",
        nickname: "Test User",
        providerId: "google-123",
        provider: OAuthProvider.GOOGLE,
        role: UserRole.USER,
        isActive: true,
      });

      expect(jest.spyOn(userRepository, "save")).toHaveBeenCalledWith(mockUser);

      expect(result).toBeInstanceOf(AuthCallbackResponseDto);
      expect(result.accessToken).toBe(mockJwtTokens.accessToken);
      expect(result.refreshToken).toBe(mockJwtTokens.refreshToken);
      expect(result.user).toEqual(UserInfoDto.of(mockUser));

      // expiresAt이 올바른 ISO 형식인지만 확인
      expect(result.expiresAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);

      // 또는 미래 시간인지 확인
      const expiresAtDate = new Date(result.expiresAt);
      expect(expiresAtDate.getTime()).toBeGreaterThan(Date.now());
    });

    it("기존 사용자로 성공적인 OAuth 처리를 해야 한다", async () => {
      // Google API 호출 모킹
      mockedAxios.post.mockResolvedValueOnce({ data: mockGoogleTokenResponse });
      mockedAxios.get.mockResolvedValueOnce({ data: mockGoogleUserInfo });

      // 기존 사용자 존재
      userRepository.findOne.mockResolvedValueOnce(mockUser);

      const result = await service.processGoogleAuth("auth-code", "state");

      expect(jest.spyOn(userRepository, "findOne")).toHaveBeenCalledTimes(1);
      expect(jest.spyOn(userRepository, "create")).not.toHaveBeenCalled();
      expect(jest.spyOn(userRepository, "save")).not.toHaveBeenCalled();

      expect(result).toBeInstanceOf(AuthCallbackResponseDto);
      expect(result.accessToken).toBe(mockJwtTokens.accessToken);
    });

    it("인증되지 않은 이메일인 경우 UnauthorizedException을 던져야 한다", async () => {
      mockedAxios.post.mockResolvedValueOnce({ data: mockGoogleTokenResponse });
      mockedAxios.get.mockResolvedValueOnce({
        data: { ...mockGoogleUserInfo, verified_email: false },
      });

      await expect(service.processGoogleAuth("auth-code", "state")).rejects.toThrow(
        new UnauthorizedException("이메일이 인증되지 않은 Google 계정입니다."),
      );
    });

    it("Google 토큰 교환 실패 시 BadRequestException을 던져야 한다", async () => {
      const axiosError = {
        isAxiosError: true,
        response: { status: 400, data: { error: "invalid_grant" } },
      };

      mockedAxios.post.mockRejectedValueOnce(axiosError);

      await expect(service.processGoogleAuth("invalid-code", "state")).rejects.toThrow(
        new BadRequestException("Google 토큰 교환에 실패했습니다."),
      );
    });

    it("Google 사용자 정보 가져오기 실패 시 UnauthorizedException을 던져야 한다", async () => {
      mockedAxios.post.mockResolvedValueOnce({ data: mockGoogleTokenResponse });

      const axiosError = {
        isAxiosError: true,
        response: { status: 401, data: { error: "invalid_token" } },
      };

      mockedAxios.get.mockRejectedValueOnce(axiosError);

      await expect(service.processGoogleAuth("auth-code", "state")).rejects.toThrow(
        new UnauthorizedException("Google 사용자 정보를 가져올 수 없습니다."),
      );
    });

    it("알 수 없는 오류 발생 시 InternalServerErrorException을 던져야 한다", async () => {
      // Google API 호출들은 모두 성공
      mockedAxios.post.mockResolvedValueOnce({ data: mockGoogleTokenResponse });
      mockedAxios.get.mockResolvedValueOnce({ data: mockGoogleUserInfo });

      // 사용자 찾기/생성 과정에서 일반 Error 발생 (Database 관련 등)
      const databaseError = new Error("Database connection timeout");
      userRepository.findOne.mockRejectedValueOnce(databaseError);

      await expect(service.processGoogleAuth("auth-code", "state")).rejects.toThrow(
        new InternalServerErrorException("OAuth 처리 중 알 수 없는 오류가 발생했습니다."),
      );
    });
  });

  describe("refreshAccessToken", () => {
    const mockRefreshTokenPayload = {
      sub: 1,
      type: "refresh",
    };

    it("유효한 리프레시 토큰으로 새 액세스 토큰을 발급해야 한다", async () => {
      jwtService.verify.mockReturnValueOnce(mockRefreshTokenPayload);
      userRepository.findOne.mockResolvedValueOnce(mockUser);
      jwtService.sign.mockImplementation((payload, options?) => {
        if (options?.expiresIn === "30d") {
          return "new-refresh-token";
        }
        return "new-access-token";
      });

      const result = await service.refreshAccessToken("valid-refresh-token");

      expect(jest.spyOn(jwtService, "verify")).toHaveBeenCalledWith("valid-refresh-token");
      expect(jest.spyOn(userRepository, "findOne")).toHaveBeenCalledWith({
        where: { id: 1, isActive: true },
      });

      expect(result).toBeInstanceOf(AuthCallbackResponseDto);
      expect(result.accessToken).toBe("new-access-token");
      expect(result.refreshToken).toBe("new-refresh-token");
      expect(result.user).toEqual(UserInfoDto.of(mockUser));
    });

    it("잘못된 토큰 타입인 경우 UnauthorizedException을 던져야 한다", async () => {
      jwtService.verify.mockReturnValueOnce({ sub: 1, type: "access" });

      await expect(service.refreshAccessToken("invalid-type-token")).rejects.toThrow(
        new UnauthorizedException("유효하지 않은 리프레시 토큰입니다."),
      );
    });

    it("사용자를 찾을 수 없는 경우 UnauthorizedException을 던져야 한다", async () => {
      jwtService.verify.mockReturnValueOnce(mockRefreshTokenPayload);
      userRepository.findOne.mockResolvedValueOnce(null);

      await expect(service.refreshAccessToken("valid-refresh-token")).rejects.toThrow(
        new UnauthorizedException("사용자를 찾을 수 없습니다."),
      );
    });

    it("만료된 토큰인 경우 UnauthorizedException을 던져야 한다", async () => {
      const expiredError = new Error("Token expired");
      expiredError.name = "TokenExpiredError";
      jwtService.verify.mockImplementationOnce(() => {
        throw expiredError;
      });

      await expect(service.refreshAccessToken("expired-token")).rejects.toThrow(
        new UnauthorizedException("리프레시 토큰이 만료되었습니다."),
      );
    });

    it("유효하지 않은 토큰인 경우 UnauthorizedException을 던져야 한다", async () => {
      jwtService.verify.mockImplementationOnce(() => {
        throw new Error("Invalid token");
      });

      await expect(service.refreshAccessToken("invalid-token")).rejects.toThrow(
        new UnauthorizedException("유효하지 않은 리프레시 토큰입니다."),
      );
    });
  });

  describe("validateJwtPayload", () => {
    const mockJwtPayload: JwtPayload = {
      sub: "test-uuid-123",
      nickname: "Test User",
      role: UserRole.USER,
    };

    it("유효한 JWT 페이로드로 사용자를 반환해야 한다", async () => {
      userRepository.findOne.mockResolvedValueOnce(mockUser);

      const result = await service.validateJwtPayload(mockJwtPayload);

      expect(jest.spyOn(userRepository, "findOne")).toHaveBeenCalledWith({
        where: { uuid: "test-uuid-123", isActive: true },
      });
      expect(result).toEqual(mockUser);
    });

    it("사용자를 찾을 수 없는 경우 UnauthorizedException을 던져야 한다", async () => {
      userRepository.findOne.mockResolvedValueOnce(null);

      await expect(service.validateJwtPayload(mockJwtPayload)).rejects.toThrow(
        new UnauthorizedException("사용자를 찾을 수 없습니다."),
      );
    });

    it("비활성화된 사용자인 경우 UnauthorizedException을 던져야 한다", async () => {
      const inactiveUser = { ...mockUser, isActive: false };
      userRepository.findOne.mockResolvedValueOnce(null); // isActive: true 조건으로 찾지 못함

      await expect(service.validateJwtPayload(mockJwtPayload)).rejects.toThrow(
        new UnauthorizedException("사용자를 찾을 수 없습니다."),
      );
    });
  });

  describe("invalidateToken", () => {
    it("토큰 무효화 로그를 출력해야 한다", () => {
      const consoleSpy = jest.spyOn(console, "log");
      const token = "mock-jwt-token-12345678901234567890";

      service.invalidateToken(token);

      expect(consoleSpy).toHaveBeenCalledWith("Token invalidated: mock-jwt-token-12345...");
    });
  });

  describe("JWT 토큰 만료 시간 파싱 (private 메서드 간접 테스트)", () => {
    it("다양한 만료 시간 형식으로 토큰을 생성해야 한다", () => {
      const mockPayload: JwtPayload = {
        sub: "test-uuid",
        nickname: "Test",
        role: UserRole.USER,
      };

      // 7d 설정 테스트
      configService.get.mockImplementation((key: string, defaultValue?: any) => {
        if (key === "JWT_EXPIRES_IN") return "7d";
        return "mock-value";
      });

      jwtService.sign.mockReturnValue("mock-token");

      const tokens: { accessToken: string; refreshToken: string; expiresAt: string } = (
        service as unknown as {
          generateJwtTokens: (user: typeof mockUser) => {
            accessToken: string;
            refreshToken: string;
            expiresAt: string;
          };
        }
      ).generateJwtTokens(mockUser);

      expect(jest.spyOn(jwtService, "sign")).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: mockUser.uuid,
          nickname: mockUser.nickname,
          role: mockUser.role,
        }),
        { expiresIn: "7d" },
      );

      expect(tokens.accessToken).toBe("mock-token");
      expect(tokens.expiresAt).toMatch(
        /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$/,
      );
    });
  });

  describe("랜덤 상태값 생성 (private 메서드 간접 테스트)", () => {
    it("URL에 포함된 state 값이 올바른 형식이어야 한다", () => {
      const url = service.generateGoogleOAuthUrl();
      const urlObj = new URL(url);
      const state = urlObj.searchParams.get("state");

      expect(state).toBeTruthy();
      expect(state!.length).toBeGreaterThan(10); // 최소 길이 확인
      expect(state).toMatch(/^[a-z0-9]+$/);
    });
  });
});
