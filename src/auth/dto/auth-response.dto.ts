import { User } from "@/users/entities/user.entity";
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

export class UserInfoDto {
  @ApiProperty({ description: "사용자 UUID", example: "123e4567-e89b-12d3-a456-426614174000" })
  uuid: string;

  @ApiProperty({ description: "이메일", example: "user@example.com" })
  email: string;

  @ApiProperty({ description: "이름", example: "홍길동" })
  name: string;

  @ApiProperty({ description: "프로필 이미지 URL", example: "https://example.com/profile.jpg" })
  profileImageUrl?: string;

  @ApiProperty({ description: "사용자 역할", example: "USER" })
  role: string;

  @ApiProperty({ description: "활성 상태", example: true })
  isActive: boolean;

  @ApiProperty({ description: "생성일", example: "2024-01-01T00:00:00.000Z" })
  createdAt: string;

  static of(user: User) {
    const dto = new UserInfoDto();

    dto.uuid = user.uuid;
    dto.email = user.email;
    dto.name = user.nickname;
    dto.profileImageUrl = user.profileImageUrl;
    dto.role = user.role;
    dto.isActive = user.isActive;
    dto.createdAt = user.createdAt.toISOString();
    return dto;
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
