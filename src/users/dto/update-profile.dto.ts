// dto/update-profile.dto.ts
import { IsString, Length, Matches, IsOptional } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { Trim } from "@/common/decorators/trim.decorator";

export class UpdateProfileDto {
  @ApiProperty({
    description: "새로운 닉네임",
    example: "새로운닉네임",
    minLength: 2,
    maxLength: 8,
    type: "string",
    pattern: "^[가-힣a-zA-Z0-9._-]+$",
    required: false,
  })
  @IsOptional()
  @Trim()
  @IsString({ message: "닉네임은 문자열이어야 합니다" })
  @Length(2, 8, { message: "닉네임은 2자 이상 8자 이하로 입력해주세요" })
  @Matches(/^[가-힣a-zA-Z0-9._-]+$/, {
    message: "닉네임은 한글, 영문, 숫자, '.', '_', '-'만 사용 가능합니다",
  })
  nickname?: string;
}
