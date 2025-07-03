// src/streamers/entities/streamer-platform.entity.ts
import { InstooBaseEntity } from "@/common/entities/base.entity";
import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { Streamer } from "./streamer.entity";

@Entity("streamer_platforms")
@Index(["streamerUuid", "platformName"], { unique: true })
@Index(["platformName"])
@Index(["isActive"])
export class StreamerPlatform extends InstooBaseEntity {
  @Column({ type: "uuid" })
  streamerUuid: string;

  @Column({ length: 50 })
  platformName: string;

  @Column({ length: 500, nullable: true })
  channelUrl?: string;

  @Column({ default: false })
  isVerified: boolean;

  @Column({ default: true })
  isActive: boolean;

  @ManyToOne(() => Streamer, (streamer) => streamer.platforms, { onDelete: "CASCADE" })
  @JoinColumn({ name: "streamerUuid", referencedColumnName: "uuid" })
  streamer: Streamer;
}
