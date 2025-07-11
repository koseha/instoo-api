import { InstooBaseEntity } from "@/common/entities/base.entity";
import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { SerializedStreamerData, Streamer } from "./streamer.entity";
import { User } from "@/users/entities/user.entity";
import { HistoryType } from "@/common/constants/history-type.enum";

@Entity("streamer_histories")
@Index(["streamerUuid"])
@Index(["action"])
@Index(["createdAt"])
@Index(["modifiedBy"])
export class StreamerHistory extends InstooBaseEntity {
  @Column({ type: "uuid" })
  streamerUuid: string;

  @Column({
    type: "enum",
    enum: HistoryType,
  })
  action: HistoryType;

  @Column({
    type: "jsonb",
    nullable: true,
    comment: "변경 전 데이터 (CREATE 액션의 경우 null)",
  })
  previousData?: SerializedStreamerData;

  @Column({
    type: "jsonb",
    nullable: true,
    comment: "변경 후 데이터 (DELETE 액션의 경우 삭제된 데이터)",
  })
  currentData?: SerializedStreamerData;

  @Column({ type: "uuid" })
  modifiedBy: string;

  @ManyToOne(() => Streamer, { nullable: true })
  @JoinColumn({ name: "streamerUuid", referencedColumnName: "uuid" })
  streamer?: Streamer;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: "modifiedBy", referencedColumnName: "uuid" })
  modifiedByUser?: User;
}
