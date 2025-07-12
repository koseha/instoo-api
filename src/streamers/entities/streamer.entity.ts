// src/streamers/entities/streamer.entity.ts
import { BaseVersionEntity } from "@/common/entities/base.entity";
import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany, Generated } from "typeorm";
import { StreamerPlatform } from "./streamer-platform.entity";
import { User } from "@/users/entities/user.entity";

@Entity("streamers")
@Index(["name"])
@Index(["isActive"])
@Index(["isVerified"])
export class Streamer extends BaseVersionEntity {
  @Column({ type: "uuid", unique: true })
  @Generated("uuid")
  uuid: string;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 500, nullable: true })
  profileImageUrl?: string;

  @Column({ type: "text", nullable: true })
  description?: string;

  @Column({ default: false })
  isVerified: boolean;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: "int", default: 0 })
  followCount: number;

  // Relations
  @OneToMany(() => StreamerPlatform, (platform) => platform.streamer, {
    cascade: true,
    eager: false,
  })
  platforms: StreamerPlatform[];

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: "createdBy", referencedColumnName: "uuid" })
  createdByUser?: User;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: "updatedBy", referencedColumnName: "uuid" })
  updatedByUser?: User;

  // 직렬화를 위한 메서드
  toSerializedData(): SerializedStreamerData {
    return {
      name: this.name,
      profileImageUrl: this.profileImageUrl,
      description: this.description,
      isVerified: this.isVerified,
      isActive: this.isActive,
      createdBy: this.createdBy || "",
      updatedBy: this.updatedBy || "",
      followCount: this.followCount,
      platforms: this.platforms?.map((platform) => ({
        idx: platform.idx,
        platformName: platform.platformName,
        channelUrl: platform.channelUrl,
        isVerified: platform.isVerified,
        isActive: platform.isActive,
      })),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      deletedAt: this.deletedAt,
      version: this.version,
    };
  }
}

// 타입 정의
export interface SerializedPlatformData {
  idx: number;
  platformName: string;
  channelUrl?: string;
  isVerified: boolean;
  isActive: boolean;
}

export interface SerializedStreamerData {
  name: string;
  profileImageUrl?: string;
  description?: string;
  isVerified: boolean;
  isActive: boolean;
  createdBy: string;
  updatedBy: string;
  followCount: number;
  platforms?: SerializedPlatformData[];
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  version: number;
}
