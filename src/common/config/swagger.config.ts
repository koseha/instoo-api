// src/config/swagger.config.ts
import { INestApplication } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import {
  InstooApiResponse,
  PageCursorDto,
  PagedResponse,
  PageInfoDto,
} from "../dto/instoo-api-response.dto";
import { UpdateProfileDto } from "@/users/dto/update-profile.dto";
import { UserInfoDto } from "@/users/dto/user-response.dto";

export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle("Instoo API")
    .setDescription(
      `
    인방 스케줄러 투게더 - API 문서
    
    ## 인증
    대부분의 API는 JWT Bearer 토큰 인증이 필요합니다.
    로그인 후 받은 토큰을 'Bearer {token}' 형태로 Authorization 헤더에 포함해주세요.
    
    ## 응답 형식
    모든 API 응답은 InstooApiResponse 형태로 통일되어 있습니다:
    \`\`\`json
    {
      "success": true,
      "message": "요청이 성공적으로 처리되었습니다.",
      "data": {...},
      "timestamp": "2025-01-01T00:00:00.000Z"
    }
    \`\`\`
    
    ## 에러 코드
    - AUTH_TOKEN_MISSING: 인증 토큰이 없음
    - AUTH_TOKEN_INVALID: 유효하지 않은 토큰
    - USER_NOT_FOUND: 사용자를 찾을 수 없음
    - STREAMER_NOT_FOUND: 방송인을 찾을 수 없음
    - SCHEDULE_NOT_FOUND: 일정을 찾을 수 없음
    - PERMISSION_DENIED: 권한 없음
  `,
    )
    .setVersion("1.0")
    .addTag("Authentication", "인증 관련 API")
    .addTag("Users", "사용자 관리 API")
    .addTag("streamers", "방송인 관리 API")
    .addTag("schedules", "일정 관리 API")
    .addTag("subscriptions", "구독 관리 API")
    .addTag("admin", "관리자 API")
    .addBearerAuth({
      type: "http",
      scheme: "bearer",
      bearerFormat: "JWT",
      name: "JWT",
      description: "JWT 토큰을 입력해주세요",
      in: "header",
    })
    .addServer("http://localhost:8080", "Local server")
    .addServer("http://dev-api.instoo.com", "Development server")
    .addServer("https://api.instoo.com", "Production server")
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    // swagger schema 추가
    extraModels: [
      InstooApiResponse,
      PagedResponse,
      PageCursorDto,
      PageInfoDto,
      UpdateProfileDto,
      UserInfoDto,
    ],
  });

  SwaggerModule.setup("api-docs", app, document, {
    swaggerOptions: {
      persistAuthorization: true, // 새로고침해도 토큰 유지
    },
  });
}
