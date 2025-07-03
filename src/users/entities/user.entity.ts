import { OAuthProvider } from "@/common/constants/oauth-provider.enum";
import { UserRole } from "@/common/constants/user-role.enum";
import { InstooBaseEntity } from "@/common/entities/base.entity";
import { Column, Entity, Generated, Index } from "typeorm";

// src/users/entities/user.entity.ts
@Entity("users")
@Index(["email"])
@Index(["provider", "providerId"])
export class User extends InstooBaseEntity {
  @Column({ type: "uuid", unique: true })
  @Generated("uuid")
  uuid: string;

  @Column({ unique: true })
  email: string;

  @Column()
  nickname: string;

  @Column({ nullable: true })
  profileImageUrl?: string;

  @Column({
    type: "enum",
    enum: OAuthProvider,
    default: OAuthProvider.GOOGLE,
  })
  provider: OAuthProvider;

  @Column({ unique: true })
  providerId: string;

  @Column({ type: "enum", enum: UserRole, default: UserRole.USER })
  role: UserRole;

  @Column({ default: true })
  isActive: boolean;
}
