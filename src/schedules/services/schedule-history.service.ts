// src/schedules/services/schedule-history.service.ts
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, EntityManager } from "typeorm";
import { ScheduleHistory, ScheduleHistoryData } from "../entities/schedule-history.entity";
import { Schedule } from "../entities/schedule.entity";

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
  async createHistory(
    schedule: Schedule,
    modifiedByUserUuid: string,
    changeType: "CREATE" | "UPDATE" | "DELETE",
    manager?: EntityManager,
  ): Promise<ScheduleHistory> {
    const repository = manager
      ? manager.getRepository(ScheduleHistory)
      : this.scheduleHistoryRepository;

    // 다음 버전 번호 계산
    const nextVersion = await this.getNextVersion(schedule.uuid, manager);

    // 스케줄 데이터를 히스토리용으로 정리 (relations 제거)
    const scheduleData = this.sanitizeScheduleData(schedule);

    const historyRecord = repository.create({
      scheduleUuid: schedule.uuid,
      version: nextVersion,
      scheduleData,
      modifiedByUserUuid,
      changeType,
    });

    return await repository.save(historyRecord);
  }

  /**
   * 특정 스케줄의 다음 버전 번호 계산
   */
  private async getNextVersion(scheduleUuid: string, manager?: EntityManager): Promise<number> {
    const repository = manager
      ? manager.getRepository(ScheduleHistory)
      : this.scheduleHistoryRepository;

    const latestHistory = await repository.findOne({
      where: { scheduleUuid },
      order: { version: "DESC" },
    });

    return latestHistory ? latestHistory.version + 1 : 1;
  }

  /**
   * 스케줄 데이터 정리 (relations 제거, 필요한 데이터만 보존)
   */
  private sanitizeScheduleData(schedule: Schedule): ScheduleHistoryData {
    const { streamer, createdByUser, updatedByUser, ...scheduleData } = schedule;

    return {
      ...scheduleData,
      // relations의 핵심 정보만 보존
      streamerInfo: streamer
        ? {
            uuid: streamer.uuid,
            name: streamer.name,
          }
        : null,
      createdByUserInfo: createdByUser
        ? {
            uuid: createdByUser.uuid,
            nickname: createdByUser.nickname,
          }
        : null,
      updatedByUserInfo: updatedByUser
        ? {
            uuid: updatedByUser.uuid,
            nickname: updatedByUser.nickname,
          }
        : null,
    };
  }
}
