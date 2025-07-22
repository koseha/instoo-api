// src/streamers/entities/streamer-follow.entity.ts
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
import { Streamer } from "./streamer.entity";

@Entity("streamer_follows")
@Unique(["userUuid", "streamerUuid"])
@Index(["streamerUuid"]) // 스트리머별 팔로우 조회용
@Index(["userUuid"]) // 유저별 팔로우 조회용
@Index(["createdAt"]) // 시간순 정렬용
export class StreamerFollow {
  @PrimaryGeneratedColumn()
  idx: number;

  @Column({ type: "uuid" })
  userUuid: string;

  @Column({ type: "uuid" })
  streamerUuid: string;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;

  // Relations
  @ManyToOne(() => Streamer, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "streamerUuid", referencedColumnName: "uuid" })
  streamer: Streamer;

  @ManyToOne(() => User, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "userUuid", referencedColumnName: "uuid" })
  user: User;
}
