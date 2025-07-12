// src/schedules/services/schedule-history.service.ts
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, EntityManager } from "typeorm";
import { ScheduleHistory } from "../entities/schedule-history.entity";
import { Schedule } from "../entities/schedule.entity";
import { HistoryType } from "@/common/constants/history-type.enum";

@Injectable()
export class ScheduleHistoryService {
  constructor(
    @InjectRepository(ScheduleHistory)
    private readonly scheduleHistoryRepository: Repository<ScheduleHistory>,
  ) {}

  /**
   * 스케줄 히스토리 기록
   * @param schedule 기록할 스케줄 데이터
   * @param modifiedByUserUuid 수정한 사용자 UUID
   * @param changeType 변경 타입
   * @param manager 트랜잭션 매니저 (선택사항)
   */
  async recordCreateWithTransaction(
    schedule: Schedule,
    modifiedBy: string,
    manager?: EntityManager,
  ): Promise<ScheduleHistory> {
    const repository = manager
      ? manager.getRepository(ScheduleHistory)
      : this.scheduleHistoryRepository;

    // 스케줄 데이터를 히스토리용으로 정리 (relations 제거)
    const currentData = schedule.toSerializedData();

    const historyRecord = repository.create({
      scheduleUuid: schedule.uuid,
      currentData,
      modifiedBy,
      action: HistoryType.CREATE,
    });

    return await repository.save(historyRecord);
  }

  /**
   *
   * @param schedule
   * @param modifiedBy
   * @param action
   * @param manager
   * @returns
   */
  async recordUpdateWithTransaction(
    entityManager: EntityManager,
    schedule: Schedule,
    previousSchedule: Schedule,
    modifiedBy: string,
  ): Promise<ScheduleHistory> {
    const history = entityManager.create(ScheduleHistory, {
      scheduleUuid: schedule.uuid,
      action: HistoryType.UPDATE,
      previousData: previousSchedule.toSerializedData(),
      currentData: schedule.toSerializedData(),
      modifiedBy,
    });

    return await entityManager.save(ScheduleHistory, history);
  }
}
