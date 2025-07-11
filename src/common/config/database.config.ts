import { TypeOrmModuleOptions } from "@nestjs/typeorm";
import { ConfigService } from "@nestjs/config";
import { User } from "@/users/entities/user.entity";
import { Streamer } from "@/streamers/entities/streamer.entity";
import { StreamerPlatform } from "@/streamers/entities/streamer-platform.entity";
import { Schedule } from "@/schedules/entities/schedule.entity";
import { ScheduleHistory } from "@/schedules/entities/schedule-history.entity";

export const getDatabaseConfig = (configService: ConfigService): TypeOrmModuleOptions => {
  const isProduction = configService.get<string>("NODE_ENV") === "production";

  return {
    type: "postgres",
    host: configService.get("DB_HOST", "localhost"),
    port: configService.get<number>("DB_PORT", 5432),
    username: configService.get("DB_USERNAME", "postgres"),
    password: configService.get("DB_PASSWORD", ""),
    database: configService.get("DB_DATABASE", "instoo_local"),
    // entities: [__dirname + "/../**/*.entity{.ts,.js}"],
    entities: [User, Streamer, StreamerPlatform, Schedule, ScheduleHistory],

    // migrations: [__dirname + "/../migrations/*{.ts,.js}"],
    synchronize: !isProduction, // 프로덕션에서는 false
    logging: !isProduction, // 프로덕션에서는 false
    extra: {
      timezone: "UTC",
    },
  };
};
