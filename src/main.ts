import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ValidationPipe } from "@nestjs/common";
import { setupSwagger } from "./common/config/swagger.config";

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
  if (process.env.NODE_ENV !== "production") {
    setupSwagger(app);
  }

  await app.listen(process.env.PORT ?? 8080);
}

bootstrap();
