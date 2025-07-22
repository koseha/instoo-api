import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { StreamersController } from "./controllers/streamers.controller";
import { StreamersService } from "./services/streamers.service";
import { StreamerPlatform } from "./entities/streamer-platform.entity";
import { Streamer } from "./entities/streamer.entity";
import { User } from "@/users/entities/user.entity";
import { JwtService } from "@nestjs/jwt";
import { StreamerHistory } from "./entities/streamer-history.entity";
import { StreamerHistoryService } from "./services/streamer-history.service";
import { StreamerFollow } from "./entities/streamer-follow.entity";
import { StreamerFollowsController } from "./controllers/streamer-follow.controller";
import { StreamerFollowService } from "./services/streamer-follow.service";
import { StreamerFollowHistory } from "./entities/streamer-follow-history.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Streamer,
      StreamerPlatform,
      User,
      StreamerHistory,
      StreamerFollow,
      StreamerFollowHistory,
    ]),
  ],
  providers: [StreamersService, StreamerHistoryService, JwtService, StreamerFollowService],
  controllers: [StreamersController, StreamerFollowsController],
  exports: [TypeOrmModule, StreamersService],
})
export class StreamersModule {}
