import { TypeOrmModuleOptions } from "@nestjs/typeorm";
import { ConfigService } from "@nestjs/config";
import { User } from "@/users/entities/user.entity";
import { Streamer } from "@/streamers/entities/streamer.entity";
import { StreamerPlatform } from "@/streamers/entities/streamer-platform.entity";
import { Schedule } from "@/schedules/entities/schedule.entity";
import { ScheduleHistory } from "@/schedules/entities/schedule-history.entity";
import { StreamerHistory } from "@/streamers/entities/streamer-history.entity";
import { ScheduleLike } from "@/schedules/entities/schedule-like.entity";
import { StreamerFollow } from "@/streamers/entities/streamer-follow.entity";
import { StreamerFollowHistory } from "@/streamers/entities/streamer-follow-history.entity";
import * as fs from "fs";
import * as path from "path";

export const getDatabaseConfig = (configService: ConfigService): TypeOrmModuleOptions => {
  const isProduction = configService.get<string>("NODE_ENV") === "production";
  const useSSL = configService.get<string>("DB_SSL") === "true";

  return {
    type: "postgres",
    host: configService.get("DB_HOST", "localhost"),
    port: configService.get<number>("DB_PORT", 5432),
    username: configService.get("DB_USERNAME", "postgres"),
    password: configService.get("DB_PASSWORD", ""),
    database: configService.get("DB_DATABASE", "instoo_local"),
    ssl:
      isProduction && useSSL
        ? {
            ca: fs
              .readFileSync(path.join(__dirname, "..", "..", "..", "rds-ca-bundle.pem"))
              .toString(),
          }
        : useSSL,
    // entities: [
    //   User,
    //   Streamer,
    //   StreamerPlatform,
    //   Schedule,
    //   ScheduleHistory,
    //   StreamerHistory,
    //   ScheduleLike,
    //   StreamerFollow,
    //   StreamerFollowHistory,
    // ],
    entities: [__dirname + "/../**/*.entity{.ts,.js}"],
    // migrations: [__dirname + "/../migrations/*{.ts,.js}"],
    // synchronize: !isProduction, // 프로덕션에서는 false
    synchronize: true, // 프로덕션에서는 false
    logging: !isProduction, // 프로덕션에서는 false
    extra: {
      timezone: "UTC",
    },
  };
};
