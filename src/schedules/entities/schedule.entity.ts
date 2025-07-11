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
@Index(["uuid"]) // UUID 인덱스 추가
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

  // Relations
  @ManyToOne(() => Streamer, { nullable: false })
  @JoinColumn({ name: "streamerUuid", referencedColumnName: "uuid" })
  streamer: Streamer;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: "createdBy", referencedColumnName: "uuid" })
  createdByUser?: User;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: "updatedBy", referencedColumnName: "uuid" })
  updatedByUser?: User;

  // 직렬화를 위한 메서드
  toSerializedData(): SerializedScheduleData {
    return {
      uuid: this.uuid,
      title: this.title,
      scheduleDate: this.scheduleDate,
      startTime: this.startTime,
      status: this.status,
      description: this.description,
      streamerUuid: this.streamerUuid,
      createdBy: this.createdBy || "",
      updatedBy: this.updatedBy || "",
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      deletedAt: this.deletedAt,
      version: this.version,
    };
  }
}

// 타입 정의
export interface SerializedScheduleData {
  uuid: string;
  title: string;
  scheduleDate: string;
  startTime?: Date | null;
  status: ScheduleStatus;
  description?: string;
  streamerUuid: string;
  createdBy: string;
  updatedBy: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  version: number;
}
