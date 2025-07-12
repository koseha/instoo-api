// src/app.controller.ts (Health Controller)
import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

import { ApiInstooResponses } from "@/common/decorators/api-response.decorator";
import { StringResponseDto } from "./string.response.dto";
import { InstooApiResponse } from "@/common/dto/instoo-api-response.dto";
import { HealthService } from "./health.service";
import { AuthErrorCode } from "@/common/constants/api-error.enum";

// 헬스체크용 에러 코드 (필요시 별도 enum 파일로 분리 가능)
export enum HealthErrorCode {
  HEALTH_SERVICE_UNAVAILABLE = "HEALTH_SERVICE_UNAVAILABLE",
  HEALTH_INTERNAL_SERVER_ERROR = "HEALTH_INTERNAL_SERVER_ERROR",
  HEALTH_CACHE_RESET_FAILED = "HEALTH_CACHE_RESET_FAILED",
}

@ApiTags("Health")
@Controller()
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({
    summary: "Hello World",
    description: "서버 상태 확인용 API",
  })
  @ApiInstooResponses(StringResponseDto, {
    success: {
      status: 200,
      description: "서버가 정상적으로 동작 중입니다.",
    },
    errors: [
      {
        status: 500,
        code: AuthErrorCode.AUTH_ACCESS_TOKEN_EXPIRED,
        description: "서버에서 예기치 않은 오류가 발생했습니다.",
      },
    ],
  })
  getHello(): InstooApiResponse<StringResponseDto> {
    const data = new StringResponseDto("Hello World!");
    return InstooApiResponse.success(data);
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
        code: AuthErrorCode.AUTH_ACCESS_TOKEN_EXPIRED,
        description: "서비스가 일시적으로 이용할 수 없습니다.",
      },
    ],
  })
  getHealth(): InstooApiResponse<StringResponseDto> {
    const data = new StringResponseDto("서버가 정상적으로 동작 중입니다. v1.0.0");
    return InstooApiResponse.success(data);
  }

  @Get("ping")
  @ApiOperation({
    summary: "핑 테스트",
    description: "서버 응답 시간 확인",
  })
  @ApiInstooResponses(StringResponseDto, {
    success: {
      status: 200,
      description: "핑 성공",
    },
    errors: [
      {
        status: 503,
        code: AuthErrorCode.AUTH_ACCESS_TOKEN_EXPIRED,
        description: "서버가 응답하지 않습니다.",
      },
    ],
  })
  ping(): InstooApiResponse<StringResponseDto> {
    const data = new StringResponseDto("pong");
    return InstooApiResponse.success(data);
  }

  @Get("reset")
  @ApiOperation({
    summary: "캐시 리셋",
    description: "서버 캐시를 초기화합니다",
  })
  @ApiInstooResponses(StringResponseDto, {
    success: {
      status: 200,
      description: "캐시 리셋 완료",
    },
    errors: [
      {
        status: 500,
        code: AuthErrorCode.AUTH_ACCESS_TOKEN_EXPIRED,
        description: "캐시 리셋 중 오류가 발생했습니다.",
      },
    ],
  })
  reset(): InstooApiResponse<StringResponseDto> {
    const data = new StringResponseDto("캐시가 성공적으로 리셋되었습니다.");
    return InstooApiResponse.success(data);
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
        status: 401,
        code: AuthErrorCode.AUTH_UNAUTHORIZED,
        description: "인증이 필요합니다.",
      },
      {
        status: 403,
        code: AuthErrorCode.AUTH_UNAUTHORIZED,
        description: "해당 리소스에 접근할 권한이 없습니다.",
      },
      {
        status: 500,
        code: AuthErrorCode.AUTH_ACCESS_TOKEN_EXPIRED,
        description: "서버에서 예기치 않은 오류가 발생했습니다.",
      },
    ],
  })
  getComplex(): InstooApiResponse<StringResponseDto> {
    const data = new StringResponseDto("복잡한 처리 완료");
    return InstooApiResponse.success(data);
  }
}
