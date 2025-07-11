// src/schedules/entities/schedule-history.entity.ts
import { InstooBaseEntity } from "@/common/entities/base.entity";
import { Column, Entity, Index, JoinColumn, ManyToOne, Generated } from "typeorm";
import { Schedule } from "./schedule.entity";
import { User } from "@/users/entities/user.entity";

// 히스토리용 스케줄 데이터 타입
export interface ScheduleHistoryData {
  uuid: string;
  title: string;
  scheduleDate: string;
  startTime?: Date | null;
  status: string;
  description?: string;
  streamerUuid: string;
  createdByUserUuid: string;
  updatedByUserUuid: string;
  createdAt: Date;
  updatedAt: Date;
  version: number;
  // relations 정보
  streamerInfo: {
    uuid: string;
    name: string;
  } | null;
  createdByUserInfo: {
    uuid: string;
    nickname: string;
  } | null;
  updatedByUserInfo: {
    uuid: string;
    nickname: string;
  } | null;
}

@Entity("schedule_histories")
@Index(["scheduleUuid"])
@Index(["version"])
@Index(["modifiedByUserUuid"])
@Index(["scheduleUuid", "version"])
export class ScheduleHistory extends InstooBaseEntity {
  @Column({ type: "uuid", unique: true })
  @Generated("uuid")
  uuid: string;

  @Column({ type: "uuid" })
  scheduleUuid: string;

  @Column({ type: "int", comment: "버전 번호 (1부터 시작)" })
  version: number;

  @Column({ type: "jsonb", comment: "해당 버전의 Schedule 객체 전체 데이터" })
  scheduleData: ScheduleHistoryData;

  @Column({ type: "uuid" })
  modifiedByUserUuid: string;

  @Column({ type: "varchar", length: 20, comment: "수정 타입 (CREATE, UPDATE, DELETE)" })
  changeType: string;

  // Relations
  @ManyToOne(() => Schedule, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "scheduleUuid", referencedColumnName: "uuid" })
  schedule: Schedule;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: "modifiedByUserUuid", referencedColumnName: "uuid" })
  modifiedByUser?: User;
}
