import { Controller, Get, Query, Res, Post, Body } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { AuthService } from "../services/auth.service";
import { ConfigService } from "@nestjs/config";
import {
  ApiInstooErrorResponse,
  ApiInstooResponse,
} from "@/common/decorators/api-response.decorator";
import { InstooApiResponse } from "@/common/dto/instoo-api-response.dto";
import { OAuthUrlResponseDto } from "../dto/auth-response.dto";
import { Response } from "express";

@ApiTags("Authentication")
@Controller()
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * OAuth 로그인 요청 - OAuth URL 생성
   * GET v1/auth/google/login
   */
  @Get("v1/auth/google/login")
  @ApiOperation({
    summary: "Google OAuth 로그인 URL 생성",
    description: "프론트엔드에서 사용할 Google OAuth 인증 URL을 생성합니다.",
  })
  @ApiInstooResponse(OAuthUrlResponseDto, {
    status: 200,
    description: "OAuth URL 생성 성공",
  })
  @ApiInstooErrorResponse(500, "서버 내부 오류", {
    code: "OAUTH_URL_GENERATION_FAILED",
    message: "OAuth URL 생성 중 오류가 발생했습니다.",
  })
  getGoogleLoginUrl(): InstooApiResponse<OAuthUrlResponseDto> {
    const oauthUrl = this.authService.generateGoogleOAuthUrl();
    const data = new OAuthUrlResponseDto(oauthUrl);

    return InstooApiResponse.success(data, "Google OAuth URL이 성공적으로 생성되었습니다.");
  }

  /**
   * OAuth 콜백 처리 - Google에서 리다이렉트되는 엔드포인트
   * GET v1/auth/google/callback?code=AUTH_CODE
   */
  @Get("v1/auth/google/callback")
  @ApiOperation({
    summary: "Google OAuth 콜백 처리",
    description: "Google OAuth 인증 완료 후 콜백을 처리하고 프론트엔드로 리다이렉트합니다.",
  })
  async googleCallback(
    @Query("code") code: string,
    @Query("state") state: string,
    @Res() res: Response,
    @Query("error") error?: string,
  ): Promise<void> {
    const frontendSuccessUrl = this.configService.get<string>("FRONTEND_SUCCESS_URL");
    const frontendErrorUrl = this.configService.get<string>("FRONTEND_ERROR_URL");

    try {
      // OAuth 에러가 있는 경우
      if (error) {
        console.error("OAuth Error:", error);
        return res.redirect(
          `${frontendErrorUrl}?error=${encodeURIComponent(error)}&message=${encodeURIComponent("OAuth 인증이 거부되었습니다.")}`,
        );
      }

      // 인증 코드가 없는 경우
      if (!code) {
        return res.redirect(
          `${frontendErrorUrl}?error=missing_code&message=${encodeURIComponent("인증 코드가 누락되었습니다.")}`,
        );
      }

      // Google OAuth 처리 및 JWT 토큰 생성
      const authResult = await this.authService.processGoogleAuth(code, state);

      // 성공적으로 처리된 경우 프론트엔드로 리다이렉트 (토큰 포함)
      const redirectUrl = `${frontendSuccessUrl}?token=${encodeURIComponent(authResult.accessToken)}&refresh_token=${encodeURIComponent(authResult.refreshToken || "")}&user_uuid=${authResult.user.uuid}`;

      return res.redirect(redirectUrl);
    } catch (error) {
      console.error("Google OAuth Callback Error:", error);

      // 에러 타입에 따른 구체적인 에러 메시지
      let errorMessage = "로그인 처리 중 오류가 발생했습니다.";
      let errorCode = "auth_failed";

      if (error instanceof Error) {
        if (error.message.includes("user_not_found")) {
          errorMessage = "사용자 정보를 찾을 수 없습니다.";
          errorCode = "user_not_found";
        } else if (error.message.includes("token_exchange_failed")) {
          errorMessage = "토큰 교환에 실패했습니다.";
          errorCode = "token_exchange_failed";
        } else if (error.message.includes("invalid_state")) {
          errorMessage = "유효하지 않은 요청입니다.";
          errorCode = "invalid_state";
        }
      }

      return res.redirect(
        `${frontendErrorUrl}?error=${errorCode}&message=${encodeURIComponent(errorMessage)}`,
      );
    }
  }

  /**
   * 리프레시 토큰을 통한 액세스 토큰 재발급
   * POST v1/auth/refresh
   */
  @Post("v1/auth/refresh")
  @ApiOperation({
    summary: "리프레시 토큰으로 액세스 토큰 재발급",
    description: "리프레시 토큰을 받아 새로운 액세스 토큰을 발급합니다.",
  })
  @ApiInstooResponse(Object, {
    status: 200,
    description: "토큰 재발급 성공",
  })
  @ApiInstooErrorResponse(400, "잘못된 요청", {
    code: "BAD_REQUEST",
    message: "리프레시 토큰이 유효하지 않습니다.",
  })
  async refreshToken(
    @Body("refreshToken") refreshToken: string,
  ): Promise<InstooApiResponse<{ accessToken: string; refreshToken?: string }>> {
    const result = await this.authService.refreshToken(refreshToken);
    return InstooApiResponse.success(result, "토큰이 성공적으로 재발급되었습니다.");
  }

  /**
   * 로그아웃 - 리프레시 토큰 무효화
   * POST v1/auth/logout
   */
  @Post("v1/auth/logout")
  @ApiOperation({
    summary: "로그아웃",
    description: "리프레시 토큰을 무효화(블랙리스트 처리 등)합니다.",
  })
  @ApiInstooResponse(Object, {
    status: 200,
    description: "로그아웃 성공",
  })
  @ApiInstooErrorResponse(400, "잘못된 요청", {
    code: "BAD_REQUEST",
    message: "리프레시 토큰이 유효하지 않습니다.",
  })
  async logout(@Body("refreshToken") refreshToken: string): Promise<InstooApiResponse<null>> {
    this.authService.invalidateToken(refreshToken);
    return Promise.resolve(InstooApiResponse.success(null, "로그아웃 되었습니다."));
  }
}
