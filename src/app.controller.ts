// src/app.controller.ts (복잡한 데코레이터 버전)
import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { AppService } from "./app.service";
import { InstooApiResponse } from "./common/dto/instoo-api-response.dto";
import {
  ApiInstooResponse,
  ApiInstooErrorResponse,
  ApiInstooResponses,
  ApiInstooSimpleResponse,
} from "./common/decorators/api-response.decorator";
import { StringResponseDto } from "./string.response.dto";

@ApiTags("App")
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({
    summary: "Hello World",
    description: "서버 상태 확인용 API",
  })
  @ApiInstooResponse(StringResponseDto, {
    status: 200,
    description: "서버가 정상적으로 동작 중입니다.",
  })
  @ApiInstooErrorResponse(500, "서버 내부 오류", {
    code: "INTERNAL_SERVER_ERROR",
    message: "서버에서 예기치 않은 오류가 발생했습니다.",
  })
  getHello(): InstooApiResponse<StringResponseDto> {
    const data = new StringResponseDto("Hello World!");
    return InstooApiResponse.success(data, "서버가 정상적으로 동작 중입니다.");
  }

  @Get("health")
  @ApiOperation({
    summary: "헬스 체크",
    description: "서버 상태 및 버전 정보 확인",
  })
  @ApiInstooResponses(StringResponseDto, {
    success: {
      status: 200,
      description: "헬스 체크 성공",
    },
    errors: [
      {
        status: 503,
        description: "서비스 이용 불가",
        code: "SERVICE_UNAVAILABLE",
        message: "서비스가 일시적으로 이용할 수 없습니다.",
      },
    ],
  })
  getHealth(): InstooApiResponse<StringResponseDto> {
    const data = new StringResponseDto("서버가 정상적으로 동작 중입니다. v1.0.0");
    return InstooApiResponse.success(data, "헬스 체크 완료");
  }

  @Get("ping")
  @ApiOperation({
    summary: "핑 테스트",
    description: "서버 응답 시간 확인",
  })
  @ApiInstooSimpleResponse({
    status: 200,
    description: "핑 성공",
  })
  @ApiInstooErrorResponse(503, "서비스 이용 불가", {
    code: "SERVICE_UNAVAILABLE",
    message: "서버가 응답하지 않습니다.",
  })
  ping(): InstooApiResponse<null> {
    return InstooApiResponse.success(null, "pong");
  }

  @Get("reset")
  @ApiOperation({
    summary: "캐시 리셋",
    description: "서버 캐시를 초기화합니다",
  })
  @ApiInstooSimpleResponse({
    status: 204,
    description: "캐시 리셋 완료",
  })
  @ApiInstooErrorResponse(500, "서버 내부 오류", {
    code: "INTERNAL_SERVER_ERROR",
    message: "캐시 리셋 중 오류가 발생했습니다.",
  })
  reset(): InstooApiResponse<null> {
    return InstooApiResponse.success(null, "캐시가 성공적으로 리셋되었습니다.");
  }

  // 복잡한 예시: 여러 에러 케이스
  @Get("complex")
  @ApiOperation({
    summary: "복잡한 API",
    description: "여러 에러 케이스를 가진 API 예시",
  })
  @ApiInstooResponses(StringResponseDto, {
    success: {
      status: 200,
      description: "요청 처리 성공",
    },
    errors: [
      {
        status: 400,
        description: "잘못된 요청",
        code: "BAD_REQUEST",
        message: "요청 파라미터가 올바르지 않습니다.",
      },
      {
        status: 401,
        description: "인증 실패",
        code: "UNAUTHORIZED",
        message: "인증이 필요합니다.",
      },
      {
        status: 403,
        description: "권한 없음",
        code: "FORBIDDEN",
        message: "해당 리소스에 접근할 권한이 없습니다.",
      },
      {
        status: 500,
        description: "서버 내부 오류",
        code: "INTERNAL_SERVER_ERROR",
        message: "서버에서 예기치 않은 오류가 발생했습니다.",
      },
    ],
  })
  getComplex(): InstooApiResponse<StringResponseDto> {
    const data = new StringResponseDto("복잡한 처리 완료");
    return InstooApiResponse.success(data, "처리가 완료되었습니다.");
  }
}
