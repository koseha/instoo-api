import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ValidationPipe } from "@nestjs/common";
import { setupSwagger } from "./common/config/swagger.config";
import { ConfigService } from "@nestjs/config";
import { GlobalExceptionFilter } from "./common/filters/global-exception.filter";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // 환경 변수 가져오기
  const nodeEnv = configService.get<string>("NODE_ENV");
  const isProduction = nodeEnv === "production";
  const origins = configService.get<string>("CORS_ORIGINS");
  const port = configService.get<number>("PORT") ?? 8080;

  // CORS origins 파싱
  const allowedOrigins = origins?.split(",").map((origin) => origin.trim()) ?? [];

  // 글로벌 필터, 인터셉터, 파이프 설정
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true, // 암시적 타입 변환 허용
      },
    }),
  );

  // 모든 라우트 앞에 /api 추가
  // app.setGlobalPrefix("api");

  // CORS 설정
  app.enableCors({
    origins: allowedOrigins,
  });

  // Swagger 설정 (프로덕션 환경이 아닐 때만)
  if (!isProduction) {
    setupSwagger(app);
  }

  await app.listen(port);

  console.log(`🎉 Application is running on: ${port}`);
}

// 부트스트랩 실행 및 에러 핸들링
bootstrap().catch((error: Error) => {
  console.error("Failed to start the application:", error);
  process.exit(1);
});
