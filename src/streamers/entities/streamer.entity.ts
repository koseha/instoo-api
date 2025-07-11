// src/streamers/entities/streamer.entity.ts
import { BaseAuditEntity } from "@/common/entities/base.entity";
import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany, Generated } from "typeorm";
import { StreamerPlatform } from "./streamer-platform.entity";
import { User } from "@/users/entities/user.entity";

@Entity("streamers")
@Index(["name"])
@Index(["isActive"])
@Index(["isVerified"])
export class Streamer extends BaseAuditEntity {
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

  @OneToMany(() => StreamerPlatform, (platform) => platform.streamer, {
    cascade: true,
    eager: false,
  })
  platforms: StreamerPlatform[];

  @Column({ type: "uuid" })
  createdByUserUuid: string;

  @Column({ type: "uuid" })
  updatedByUserUuid: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: "createdByUserUuid", referencedColumnName: "uuid" })
  createdByUser?: User;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: "updatedByUserUuid", referencedColumnName: "uuid" })
  updatedByUser?: User;

  @Column({ type: "int", default: 0 })
  followCount: number;
}
