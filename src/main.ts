import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ValidationPipe } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 글로벌 Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // CORS 설정 (필요한 경우)
  app.enableCors({
    origin: ["http://localhost:8080"], // 허용할 Origin
    credentials: true, // 쿠키 허용
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE", // 허용할 HTTP 메서드
    allowedHeaders: "Content-Type, Authorization", // 허용할 헤더
  });

  // Swagger 설정
  const config = new DocumentBuilder()
    .setTitle("Instoo API")
    .setDescription("인방 스케줄러 투게더 - API 문서")
    .setVersion("1.0")
    .addTag("auth", "인증 관련 API")
    .addTag("users", "사용자 관리 API")
    .addTag("streamers", "방송인 관리 API")
    .addTag("schedules", "일정 관리 API")
    .addTag("subscriptions", "구독 관리 API")
    .addTag("admin", "관리자 API")
    .addBearerAuth() // JWT Bearer 토큰 인증
    .addServer("http://localhost:8080", "Local server")
    .addServer("http://dev-api.instoo.com", "Development server")
    .addServer("https://api.instoo.com", "Production server")
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api-docs", app, document, {
    swaggerOptions: {
      persistAuthorization: true, // 새로고침해도 토큰 유지
    },
  });

  await app.listen(process.env.PORT ?? 8080);
}

bootstrap();
