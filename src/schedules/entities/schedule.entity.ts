// src/schedules/entities/schedule.entity.ts
import { BaseVersionEntity } from "@/common/entities/base.entity";
import { Column, Entity, Index, JoinColumn, ManyToOne, Generated } from "typeorm";
import { Streamer } from "@/streamers/entities/streamer.entity";
import { User } from "@/users/entities/user.entity";

@Entity("schedules")
@Index(["scheduleDate"])
@Index(["streamerUuid"])
@Index(["isBreak"])
@Index(["isTimeUndecided"])
@Index(["scheduleDate", "streamerUuid"])
@Index(["scheduleDate", "startTime", "id"]) // cursor 기반 페이지네이션용
export class Schedule extends BaseVersionEntity {
  @Column({ type: "uuid", unique: true })
  @Generated("uuid")
  uuid: string;

  @Column({ length: 200 })
  title: string;

  @Column({ type: "date" })
  scheduleDate: Date;

  @Column({ type: "timestamptz", nullable: true })
  startTime?: Date | null;

  @Column({ default: false })
  isTimeUndecided: boolean;

  @Column({ default: false })
  isBreak: boolean;

  @Column({ type: "text", nullable: true })
  description?: string;

  @Column({ type: "uuid" })
  streamerUuid: string;

  // Relations
  @ManyToOne(() => Streamer, { nullable: false })
  @JoinColumn({ name: "streamerUuid", referencedColumnName: "uuid" })
  streamer: Streamer;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: "createdBy" })
  createdByUser?: User;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: "updatedBy" })
  updatedByUser?: User;
}
