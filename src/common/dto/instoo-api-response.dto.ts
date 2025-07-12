import { ApiProperty } from "@nestjs/swagger";
import { ApiErrorCode } from "../constants/api-error.enum";

export class InstooApiResponse<T> {
  @ApiProperty({
    description: "에러 코드",
    nullable: true,
    example: null,
  })
  readonly code: ApiErrorCode | null;

  @ApiProperty({ description: "응답 본문" })
  readonly content: T | null;

  constructor(code: ApiErrorCode | null, content: T | null) {
    this.code = code;
    this.content = content;
  }

  static success<T>(content: T): InstooApiResponse<T> {
    return new InstooApiResponse<T>(null, content);
  }

  static error(code: ApiErrorCode): InstooApiResponse<null> {
    return new InstooApiResponse<null>(code, null);
  }
}

export class PageCursorDto {
  @ApiProperty()
  concurrentUserCount: number;

  @ApiProperty()
  liveId: number;
}

export class PageInfoDto {
  @ApiProperty({ type: PageCursorDto, nullable: true })
  next: PageCursorDto | null;
}

export class PagedResponse<T> {
  @ApiProperty({ example: 20, description: "페이지 크기" })
  size: number;

  @ApiProperty({ type: PageInfoDto })
  page: PageInfoDto;

  @ApiProperty({ isArray: true })
  data: T[];
}
