import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Schedule } from "./entities/schedule.entity";
import { SchedulesService } from "./services/schedules.service";
import { SchedulesController } from "./controllers/schedules.controller";
import { Streamer } from "@/streamers/entities/streamer.entity";
import { User } from "@/users/entities/user.entity";
import { JwtService } from "@nestjs/jwt";
import { ScheduleHistory } from "./entities/schedule-history.entity";
import { ScheduleHistoryService } from "./services/schedule-history.service";

@Module({
  imports: [TypeOrmModule.forFeature([Schedule, Streamer, User, ScheduleHistory])],
  providers: [SchedulesService, ScheduleHistoryService, JwtService],
  controllers: [SchedulesController],
  exports: [SchedulesService, TypeOrmModule],
})
export class SchedulesModule {}
