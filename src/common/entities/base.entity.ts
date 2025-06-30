// src/common/entities/base.entity.ts
import {
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  Column,
} from "typeorm";

export abstract class BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @CreateDateColumn({ type: "timestamp" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamp" })
  updatedAt: Date;

  @DeleteDateColumn({ type: "timestamp", nullable: true })
  deletedAt?: Date;
}

// 생성자/수정자 정보가 필요한 엔티티용
export abstract class BaseAuditEntity extends BaseEntity {
  @Column({ nullable: true })
  createdBy?: number; // User ID

  @Column({ nullable: true })
  updatedBy?: number; // User ID
}

// 버전 관리가 필요한 엔티티용 (스케줄 등)
export abstract class BaseVersionEntity extends BaseAuditEntity {
  @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  lastUpdatedAt: Date;

  @Column({ default: 1 })
  version: number;
}
