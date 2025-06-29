import { ApiProperty } from "@nestjs/swagger";

export class InstooApiResponse<T> {
  @ApiProperty({ example: 200, description: "HTTP 상태 코드" })
  readonly code: number;

  @ApiProperty({ example: "해당 이메일은 이미 존재합니다.", description: "에러 메시지" })
  readonly message: string | null;

  @ApiProperty({ description: "응답 본문" })
  readonly content: T | null;

  constructor(code: number, message: string | null, content: T | null) {
    this.code = code;
    this.message = message;
    this.content = content;
  }

  static success<T>(content: T, message: string | null = null, code = 200): InstooApiResponse<T> {
    return new InstooApiResponse<T>(code, message, content);
  }

  static error(message: string, code = 400): InstooApiResponse<null> {
    return new InstooApiResponse<null>(code, message, null);
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
