import { Module } from "@nestjs/common";
import { HealthModule } from "./health/health.module";
import { ConfigModule } from "@nestjs/config";

const nodeEnv = process.env.NODE_ENV || "development";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env", `.env.${nodeEnv}`],
    }),
    HealthModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
