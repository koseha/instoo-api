// src/schedules/entities/schedule.entity.ts
import { BaseVersionEntity } from "@/common/entities/base.entity";
import { Column, Entity, Index, JoinColumn, ManyToOne, Generated } from "typeorm";
import { Streamer } from "@/streamers/entities/streamer.entity";
import { User } from "@/users/entities/user.entity";
import { ScheduleStatus } from "@/common/constants/schedule-status.enum";

@Entity("schedules")
@Index(["scheduleDate"])
@Index(["streamerUuid"])
@Index(["status"])
@Index(["scheduleDate", "streamerUuid"])
export class Schedule extends BaseVersionEntity {
  @Column({ type: "uuid", unique: true })
  @Generated("uuid")
  uuid: string;

  @Column({ length: 50 })
  title: string;

  @Column({ type: "varchar", comment: "일정 날짜 (KST 기준 YYYY-MM-DD 형식)" })
  scheduleDate: string;

  @Column({ type: "timestamptz", nullable: true, comment: "시작 시간 (UTC)" })
  startTime?: Date | null;

  @Column({
    type: "enum",
    enum: ScheduleStatus,
  })
  status: ScheduleStatus;

  @Column({ type: "text", nullable: true })
  description?: string;

  @Column({ type: "uuid" })
  streamerUuid: string;

  @Column({ type: "uuid" })
  createdByUserUuid: string;

  @Column({ type: "uuid" })
  updatedByUserUuid: string;

  // Relations
  @ManyToOne(() => Streamer, { nullable: false })
  @JoinColumn({ name: "streamerUuid", referencedColumnName: "uuid" })
  streamer: Streamer;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: "createdByUserUuid", referencedColumnName: "uuid" })
  createdByUser?: User;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: "updatedByUserUuid", referencedColumnName: "uuid" })
  updatedByUser?: User;
}
