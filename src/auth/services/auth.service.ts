import { Injectable, UnauthorizedException, BadRequestException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { Repository } from "typeorm";
import { InjectRepository } from "@nestjs/typeorm";

import { User } from "@/users/entities/user.entity";
import { AuthCallbackResponseDto, UserInfoDto } from "../dto/auth-response.dto";
import { OAuthProvider } from "@/common/constants/oauth-provider.enum";
import axios from "axios";
import { UserRole } from "@/common/constants/user-role.enum";

interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

interface GoogleUserInfo {
  id: string;
  email: string;
  verified_email: boolean;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
  locale: string;
}

interface JwtPayload {
  sub: number; // user id
  email: string;
  name: string;
  role: string;
  iat?: number;
  exp?: number;
}

interface RefreshTokenPayload {
  sub: number;
  type: string;
}

@Injectable()
export class AuthService {
  private readonly googleClientId: string;
  private readonly googleClientSecret: string;
  private readonly googleRedirectUri: string;
  private readonly jwtSecret: string;

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {
    this.googleClientId = this.configService.get<string>("GOOGLE_CLIENT_ID")!;
    this.googleClientSecret = this.configService.get<string>("GOOGLE_CLIENT_SECRET")!;
    this.googleRedirectUri = this.configService.get<string>("GOOGLE_CALLBACK_URL")!;
    this.jwtSecret = this.configService.get<string>("JWT_SECRET")!;
  }

  /**
   * OAuth URL 생성 및 상태 저장
   */
  generateGoogleOAuthUrl(): string {
    const state = this.generateRandomState();
    const scope = "openid email profile";

    const params = new URLSearchParams({
      client_id: this.googleClientId,
      redirect_uri: this.googleRedirectUri,
      response_type: "code",
      scope,
      state,
      access_type: "offline", // refresh token을 받기 위해
      prompt: "consent", // 항상 동의 화면 표시 (refresh token 확보)
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  /**
   * OAuth 콜백 처리 (토큰 교환 ~ JWT 생성)
   */
  async processGoogleAuth(code: string, state?: string): Promise<AuthCallbackResponseDto> {
    try {
      // Google에서 액세스 토큰 교환
      const tokenResponse = await this.exchangeCodeForTokens(code);

      // Google에서 사용자 정보 가져오기
      const googleUser = await this.getGoogleUserInfo(tokenResponse.access_token);

      // 사용자 정보 검증
      if (!googleUser.verified_email) {
        throw new UnauthorizedException("이메일이 인증되지 않은 Google 계정입니다.");
      }

      // 사용자 정보 저장/업데이트 및 JWT 토큰 생성
      const user = await this.findOrCreateUser(googleUser);
      const tokens = this.generateJwtTokens(user);

      return new AuthCallbackResponseDto({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: UserInfoDto.of(user),
        expiresAt: tokens.expiresAt,
      });
    } catch (error) {
      console.error("Google OAuth processing error:", error);

      if (axios.isAxiosError(error) && error.response?.status === 400) {
        throw new BadRequestException("token_exchange_failed: Google 토큰 교환에 실패했습니다.");
      }

      // 이미 처리된 예외인 경우 그대로 throw
      if (error instanceof UnauthorizedException || error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException("OAuth 처리 중 알 수 없는 오류가 발생했습니다.");
    }
  }

  /**
   * 인증 코드를 액세스 토큰으로 교환
   */
  private async exchangeCodeForTokens(code: string): Promise<GoogleTokenResponse> {
    const tokenUrl = "https://oauth2.googleapis.com/token";

    const params = {
      client_id: this.googleClientId,
      client_secret: this.googleClientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: this.googleRedirectUri,
    };

    try {
      const response = await axios.post<GoogleTokenResponse>(tokenUrl, params, {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error("Token exchange error:", error.response?.data || error.message);
      } else {
        console.error("Unknown error:", error);
      }
      throw new BadRequestException("Google 토큰 교환에 실패했습니다.");
    }
  }

  /**
   * Google API에서 사용자 정보 가져오기
   */
  private async getGoogleUserInfo(accessToken: string): Promise<GoogleUserInfo> {
    const userInfoUrl = "https://www.googleapis.com/oauth2/v2/userinfo";

    try {
      const response = await axios.get<GoogleUserInfo>(userInfoUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error("Google user info error:", error.response?.data || error.message);
      } else {
        console.error("Unknown error:", error);
      }
      throw new UnauthorizedException("Google 사용자 정보를 가져올 수 없습니다.");
    }
  }

  /**
   * 사용자 찾기 또는 생성
   */
  private async findOrCreateUser(googleUser: GoogleUserInfo): Promise<User> {
    // 기존 사용자 찾기 (Google ID 또는 이메일로)
    let user = await this.userRepository.findOne({
      where: [
        { providerId: googleUser.id, provider: OAuthProvider.GOOGLE },
        { email: googleUser.email },
      ],
    });

    if (user) {
      // 기존 사용자 정보 업데이트
      user.nickname = googleUser.name;
      user.profileImageUrl = googleUser.picture;
      user.providerId = googleUser.id; // providerId가 없던 기존 사용자의 경우
      user.provider = OAuthProvider.GOOGLE; // provider가 없던 기존 사용자의 경우
      user.isActive = true;

      await this.userRepository.save(user);
    } else {
      // 새 사용자 생성
      user = this.userRepository.create({
        email: googleUser.email,
        nickname: googleUser.name,
        profileImageUrl: googleUser.picture,
        providerId: googleUser.id,
        provider: OAuthProvider.GOOGLE,
        role: UserRole.USER,
        isActive: true,
      });

      await this.userRepository.save(user);
    }

    return user;
  }

  /**
   * JWT 토큰 생성
   */
  private generateJwtTokens(user: User): {
    accessToken: string;
    refreshToken: string;
    expiresAt: string;
  } {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      name: user.nickname, // user.name을 user.nickname으로 수정
      role: user.role,
    };

    const expiresIn = this.configService.get<string>("JWT_EXPIRES_IN", "7d");
    const expiresInSeconds = this.parseExpiresIn(expiresIn);
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString();

    const accessToken = this.jwtService.sign(payload, { expiresIn });

    // Refresh Token (더 긴 만료 시간)
    const refreshToken = this.jwtService.sign(
      { sub: user.id, type: "refresh" },
      { expiresIn: "30d" },
    );

    return {
      accessToken,
      refreshToken,
      expiresAt,
    };
  }

  /**
   * 리프레시 토큰으로 새 액세스 토큰 발급
   */
  async refreshAccessToken(refreshToken: string): Promise<AuthCallbackResponseDto> {
    try {
      const decoded = this.jwtService.verify<RefreshTokenPayload>(refreshToken);

      if (decoded.type !== "refresh") {
        throw new UnauthorizedException("유효하지 않은 리프레시 토큰입니다.");
      }

      const user = await this.userRepository.findOne({
        where: { id: decoded.sub, isActive: true },
      });

      if (!user) {
        throw new UnauthorizedException("사용자를 찾을 수 없습니다.");
      }

      const tokens = this.generateJwtTokens(user);

      return new AuthCallbackResponseDto({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: UserInfoDto.of(user),
        expiresAt: tokens.expiresAt,
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === "TokenExpiredError") {
          throw new UnauthorizedException("리프레시 토큰이 만료되었습니다.");
        }
        if (error instanceof UnauthorizedException) {
          throw error;
        }
      }
      throw new UnauthorizedException("유효하지 않은 리프레시 토큰입니다.");
    }
  }

  /**
   * JWT 토큰 검증 (JWT Strategy에서 사용)
   */
  async validateJwtPayload(payload: JwtPayload): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: payload.sub, isActive: true },
    });

    if (!user) {
      throw new UnauthorizedException("사용자를 찾을 수 없습니다.");
    }

    return user;
  }

  /**
   * 토큰 무효화 (로그아웃)
   * 실제로는 블랙리스트 구현이 필요하지만, 여기서는 단순화
   */
  invalidateToken(token: string): void {
    // TODO: 토큰 블랙리스트 구현 (Redis 등)
    // 현재는 클라이언트에서 토큰 삭제로 처리
    console.log(`Token invalidated: ${token.substring(0, 20)}...`);
  }

  /**
   * 랜덤 상태값 생성 (CSRF 방지)
   */
  private generateRandomState(): string {
    return (
      Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
    );
  }

  /**
   * JWT 만료 시간 파싱 (7d, 1h 등을 초로 변환)
   */
  private parseExpiresIn(expiresIn: string): number {
    const unit = expiresIn.slice(-1);
    const value = parseInt(expiresIn.slice(0, -1));

    switch (unit) {
      case "s":
        return value;
      case "m":
        return value * 60;
      case "h":
        return value * 60 * 60;
      case "d":
        return value * 24 * 60 * 60;
      default:
        return 7 * 24 * 60 * 60; // 기본 7일
    }
  }
}
