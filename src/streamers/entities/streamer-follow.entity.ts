// src/streamers/entities/streamer-follow.entity.ts
import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from "typeorm";
import { User } from "@/users/entities/user.entity";
import { Streamer } from "./streamer.entity";
import { InstooBaseEntity } from "@/common/entities/base.entity";

@Entity("streamer_follows")
@Unique(["userUuid", "streamerUuid"])
@Index(["streamerUuid"]) // 스트리머별 팔로우 조회용
@Index(["userUuid", "isActive", "updatedAt"]) // 핵심 복합 인덱스
@Index(["createdAt"]) // 시간순 정렬용
export class StreamerFollow extends InstooBaseEntity {
  @Column({ type: "uuid" })
  userUuid: string;

  @Column({ type: "uuid" })
  streamerUuid: string;

  @Column({ type: "boolean", nullable: true, default: true })
  isActive: boolean;

  // Relations
  @ManyToOne(() => Streamer, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "streamerUuid", referencedColumnName: "uuid" })
  streamer: Streamer;

  @ManyToOne(() => User, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "userUuid", referencedColumnName: "uuid" })
  user: User;
}
