// src/schedules/entities/schedule-history.entity.ts
import { InstooBaseEntity } from "@/common/entities/base.entity";
import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { Schedule, SerializedScheduleData } from "./schedule.entity";
import { User } from "@/users/entities/user.entity";
import { HistoryType } from "@/common/constants/history-type.enum";

@Entity("schedule_histories")
@Index(["scheduleUuid"])
@Index(["action"])
@Index(["createdAt"])
@Index(["modifiedBy"])
@Index(["scheduleUuid", "createdAt"]) // 시간순 조회용 복합 인덱스
export class ScheduleHistory extends InstooBaseEntity {
  @Column({ type: "uuid" })
  scheduleUuid: string;

  @Column({
    type: "enum",
    enum: HistoryType,
  })
  action: HistoryType;

  @Column({
    type: "jsonb",
    nullable: true,
    comment: "변경 전 데이터 (CREATE 액션의 경우 null)",
  })
  previousData?: SerializedScheduleData;

  @Column({
    type: "jsonb",
    nullable: true,
    comment: "변경 후 데이터 (DELETE 액션의 경우 삭제된 데이터)",
  })
  currentData?: SerializedScheduleData;

  @Column({ type: "uuid" })
  modifiedBy: string;

  // Relations
  @ManyToOne(() => Schedule, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "scheduleUuid", referencedColumnName: "uuid" })
  schedule: Schedule;

  @ManyToOne(() => User, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "modifiedBy", referencedColumnName: "uuid" })
  modifiedByUser?: User;
}
