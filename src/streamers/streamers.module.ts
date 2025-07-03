import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { StreamersController } from "./controllers/streamers.controller";
import { StreamersService } from "./services/streamers.service";
import { StreamerPlatform } from "./entities/streamer-platform.entity";
import { Streamer } from "./entities/streamer.entity";
import { User } from "@/users/entities/user.entity";
import { JwtService } from "@nestjs/jwt";

@Module({
  imports: [TypeOrmModule.forFeature([Streamer, StreamerPlatform, User])],
  providers: [StreamersService, JwtService],
  controllers: [StreamersController],
  exports: [TypeOrmModule, StreamersService],
})
export class StreamersModule {}
