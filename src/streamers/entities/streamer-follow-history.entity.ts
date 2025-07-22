// src/streamers/entities/streamer-follow-history.entity.ts
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { User } from "@/users/entities/user.entity";
import { Streamer } from "./streamer.entity";

export enum FollowAction {
  FOLLOW = "FOLLOW",
  UNFOLLOW = "UNFOLLOW",
}

@Entity("streamer_follow_histories")
@Index(["userUuid", "createdAt"]) // 유저별 팔로우 히스토리 조회용
@Index(["streamerUuid", "createdAt"]) // 스트리머별 팔로우 히스토리 조회용
@Index(["action", "createdAt"]) // 액션별 통계용
export class StreamerFollowHistory {
  @PrimaryGeneratedColumn()
  idx: number;

  @Column({ type: "uuid" })
  userUuid: string;

  @Column({ type: "uuid" })
  streamerUuid: string;

  @Column({ type: "enum", enum: FollowAction })
  action: FollowAction;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;

  // Relations
  @ManyToOne(() => Streamer, { nullable: false })
  @JoinColumn({ name: "streamerUuid", referencedColumnName: "uuid" })
  streamer: Streamer;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: "userUuid", referencedColumnName: "uuid" })
  user: User;
}
