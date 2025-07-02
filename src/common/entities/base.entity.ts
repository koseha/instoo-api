// src/common/entities/base.entity.ts
import {
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Column,
} from "typeorm";

export abstract class InstooBaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt: Date;

  @DeleteDateColumn({ type: "timestamptz", nullable: true })
  deletedAt?: Date;
}

// 생성자/수정자 정보가 필요한 엔티티용
export abstract class BaseAuditEntity extends InstooBaseEntity {
  @Column({ nullable: true })
  createdBy?: number; // User ID

  @Column({ nullable: true })
  updatedBy?: number; // User ID
}

// 버전 관리가 필요한 엔티티용 (스케줄 등)
export abstract class BaseVersionEntity extends BaseAuditEntity {
  @Column({ type: "timestamptz", default: () => "CURRENT_TIMESTAMP" })
  lastUpdatedAt: Date;

  @Column({ default: 1 })
  version: number;
}
