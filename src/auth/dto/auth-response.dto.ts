import { UserInfoDto } from "@/users/dto/user-response.dto";
import { ApiProperty } from "@nestjs/swagger";

export class OAuthUrlResponseDto {
  @ApiProperty({
    description: "OAuth 인증 URL",
    example: "https://accounts.google.com/o/oauth2/v2/auth?client_id=...",
  })
  oauthUrl: string;

  constructor(oauthUrl: string) {
    this.oauthUrl = oauthUrl;
  }
}

export class AuthCallbackResponseDto {
  @ApiProperty({ description: "JWT 액세스 토큰" })
  accessToken: string;

  @ApiProperty({ description: "리프레시 토큰" })
  refreshToken?: string;

  @ApiProperty({ description: "사용자 정보", type: UserInfoDto })
  user: UserInfoDto;

  @ApiProperty({ description: "토큰 만료 시간", example: "2024-01-08T00:00:00.000Z" })
  expiresAt: string;

  constructor(data: {
    accessToken: string;
    refreshToken?: string;
    user: UserInfoDto;
    expiresAt: string;
  }) {
    this.accessToken = data.accessToken;
    this.refreshToken = data.refreshToken;
    this.user = data.user;
    this.expiresAt = data.expiresAt;
  }
}
