import { Controller, Get, Query, Res, Post, Body } from "@nestjs/common";
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AuthService } from "../services/auth.service";
import { ConfigService } from "@nestjs/config";
import {
  ApiInstooResponses,
  ApiInstooSimpleResponse,
} from "@/common/decorators/api-response.decorator";
import { InstooApiResponse } from "@/common/dto/instoo-api-response.dto";
import { OAuthUrlResponseDto } from "../dto/auth-response.dto";
import { Response } from "express";
import { AuthErrorCode } from "@/common/constants/api-error.enum";
import {
  ApiException,
  ApiInternalServerException,
  ApiUnauthorizedException,
} from "@/common/exceptions/api-exceptions";

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
  @ApiInstooResponses(OAuthUrlResponseDto, {
    success: {
      status: 200,
      description: "OAuth URL 생성 성공",
    },
    errors: [
      {
        status: 500,
        code: AuthErrorCode.AUTH_URL_GENERATION_FAILED,
        description: "OAuth URL 생성 중 오류가 발생했습니다.",
      },
    ],
  })
  getGoogleLoginUrl(): InstooApiResponse<OAuthUrlResponseDto> {
    const oauthUrl = this.authService.generateGoogleOAuthUrl();
    const data = new OAuthUrlResponseDto(oauthUrl);

    return InstooApiResponse.success(data);
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
          `${frontendErrorUrl}?errorCode=${AuthErrorCode.AUTH_PROVIDER_ERROR}&message=${encodeURIComponent("OAuth 인증이 거부되었습니다.")}`,
        );
      }

      // 인증 코드가 없는 경우
      if (!code) {
        return res.redirect(
          `${frontendErrorUrl}?errorCode=${AuthErrorCode.AUTH_TOKEN_EXCHANGE_FAILED}&message=${encodeURIComponent("인증 코드가 누락되었습니다.")}`,
        );
      }

      // 상태값 검증 (필요시)
      if (!state) {
        return res.redirect(
          `${frontendErrorUrl}?errorCode=${AuthErrorCode.AUTH_INVALID_STATE}&message=${encodeURIComponent("상태값이 누락되었습니다.")}`,
        );
      }

      // Google OAuth 처리 및 JWT 토큰 생성
      const authResult = await this.authService.processGoogleAuth(code, state);

      // 성공적으로 처리된 경우 프론트엔드로 리다이렉트 (토큰 포함)
      const redirectUrl = `${frontendSuccessUrl}?token=${encodeURIComponent(authResult.accessToken)}&refresh_token=${encodeURIComponent(authResult.refreshToken || "")}&user_uuid=${authResult.user.uuid}`;

      return res.redirect(redirectUrl);
    } catch (error) {
      console.error("Google OAuth Callback Error:", error);

      // 커스텀 예외의 에러 코드 추출
      let errorCode = AuthErrorCode.AUTH_OAUTH_PROCESSING_ERROR;
      let message = "로그인 처리 중 오류가 발생했습니다.";

      // ApiException 계열의 에러인 경우 에러 코드 추출
      if (
        error instanceof ApiUnauthorizedException ||
        error instanceof ApiException ||
        error instanceof ApiInternalServerException
      ) {
        const response = error.getResponse() as { code: AuthErrorCode };
        errorCode = response.code;

        // 에러 코드에 따른 사용자 친화적 메시지
        switch (errorCode) {
          case AuthErrorCode.AUTH_EMAIL_NOT_VERIFIED:
            message = "이메일이 인증되지 않은 Google 계정입니다.";
            break;
          case AuthErrorCode.AUTH_TOKEN_EXCHANGE_FAILED:
            message = "Google 토큰 교환에 실패했습니다.";
            break;
          case AuthErrorCode.AUTH_USER_INFO_FAILED:
            message = "Google 사용자 정보를 가져올 수 없습니다.";
            break;
          case AuthErrorCode.AUTH_INVALID_STATE:
            message = "상태값 검증에 실패했습니다.";
            break;
          case AuthErrorCode.AUTH_PROVIDER_ERROR:
            message = "소셜 로그인 제공자 오류가 발생했습니다.";
            break;
          case AuthErrorCode.AUTH_OAUTH_PROCESSING_ERROR:
          default:
            message = "OAuth 처리 중 알 수 없는 오류가 발생했습니다.";
            break;
        }
      }

      return res.redirect(
        `${frontendErrorUrl}?errorCode=${errorCode}&message=${encodeURIComponent(message)}`,
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
  @ApiBody({
    description: "리프레시 토큰",
    schema: {
      example: {
        refreshToken: "refresh-token",
      },
    },
  })
  @ApiInstooResponses(Object, {
    success: {
      status: 200,
      description: "토큰 재발급 성공",
    },
    errors: [
      {
        status: 400,
        code: AuthErrorCode.AUTH_INVALID_REFRESH_TOKEN,
        description: "리프레시 토큰이 유효하지 않습니다.",
      },
      {
        status: 401,
        code: AuthErrorCode.AUTH_REFRESH_TOKEN_EXPIRED,
        description: "리프레시 토큰이 만료되었습니다.",
      },
      {
        status: 401,
        code: AuthErrorCode.AUTH_USER_NOT_FOUND,
        description: "사용자를 찾을 수 없습니다.",
      },
    ],
  })
  @ApiBearerAuth()
  async refreshToken(
    @Body("refreshToken") refreshToken: string,
  ): Promise<InstooApiResponse<{ accessToken: string; refreshToken?: string }>> {
    const result = await this.authService.refreshToken(refreshToken);
    return InstooApiResponse.success(result);
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
  @ApiInstooSimpleResponse({
    status: 200,
    description: "로그아웃 성공",
  })
  logout(@Body("refreshToken") refreshToken: string): InstooApiResponse<null> {
    this.authService.invalidateToken(refreshToken); // await 추가
    return InstooApiResponse.success(null);
  }
}
