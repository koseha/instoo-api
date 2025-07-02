import { ApiProperty } from "@nestjs/swagger";
import { User } from "../entities/user.entity";

export class UserInfoDto {
  @ApiProperty({ description: "사용자 UUID", example: "123e4567-e89b-12d3-a456-426614174000" })
  uuid: string;

  @ApiProperty({ description: "이메일", example: "user@example.com" })
  email: string;

  @ApiProperty({ description: "이름", example: "홍길동" })
  nickname: string;

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
    dto.nickname = user.nickname;
    dto.profileImageUrl = user.profileImageUrl;
    dto.role = user.role;
    dto.isActive = user.isActive;
    dto.createdAt = user.createdAt.toISOString();
    return dto;
  }
}
