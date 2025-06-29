// src/app.controller.ts (수정된 버전)
import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { AppService } from "./app.service";
import { InstooApiResponse } from "./common/dto/instoo-api-response.dto";
import {
  ApiInstooResponse,
  ApiInstooErrorResponse,
  ApiInstooResponses,
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
}
