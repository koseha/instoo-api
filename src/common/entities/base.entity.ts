// src/common/entities/base.entity.ts
import { User } from "@/users/entities/user.entity";
import {
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Column,
} from "typeorm";

export abstract class InstooBaseEntity {
  @PrimaryGeneratedColumn()
  idx: number;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt: Date;

  @DeleteDateColumn({ type: "timestamptz", nullable: true })
  deletedAt?: Date;
}

// 생성자/수정자 정보가 필요한 엔티티용
export abstract class BaseAuditEntity extends InstooBaseEntity {
  @Column({ type: "uuid" })
  createdBy?: string; // User UUID

  @Column({ type: "uuid" })
  updatedBy?: string; // User UUID

  // 관계 정의를 위한 추상 메서드 (하위 클래스에서 구현)
  abstract createdByUser?: User;
  abstract updatedByUser?: User;
}

// 버전 관리가 필요한 엔티티용 (스케줄 등)
export abstract class BaseVersionEntity extends BaseAuditEntity {
  @Column({ default: 1 })
  version: number;
}
