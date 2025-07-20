// src/schedules/entities/schedule-like.entity.ts
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from "typeorm";
import { User } from "@/users/entities/user.entity";
import { Schedule } from "./schedule.entity";

@Entity("schedule_likes")
@Unique(["userUuid", "scheduleUuid"])
@Index(["scheduleUuid"]) // 스케줄별 좋아요 조회용
@Index(["userUuid"]) // 유저별 좋아요 조회용
@Index(["createdAt"]) // 시간순 정렬용
export class ScheduleLike {
  @PrimaryGeneratedColumn()
  idx: number;

  @Column({ type: "uuid" })
  userUuid: string;

  @Column({ type: "uuid" })
  scheduleUuid: string;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;

  // Relations
  @ManyToOne(() => Schedule, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "scheduleUuid", referencedColumnName: "uuid" })
  schedule: Schedule;

  @ManyToOne(() => User, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "userUuid", referencedColumnName: "uuid" })
  user: User;
}
