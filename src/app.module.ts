import { Module } from "@nestjs/common";
import { HealthModule } from "./health/health.module";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { AuthModule } from "./auth/auth.module";
import { TypeOrmModule } from "@nestjs/typeorm";
import { getDatabaseConfig } from "./common/config/database.config";
import { StreamersModule } from "./streamers/streamers.module";
import { UsersModule } from "./users/users.module";

const nodeEnv = process.env.NODE_ENV || "development";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env", `.env.${nodeEnv}`],
    }),
    // 데이터베이스 설정
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: getDatabaseConfig,
    }),
    UsersModule,
    HealthModule,
    AuthModule,
    StreamersModule,
  ],
})
export class AppModule {}
