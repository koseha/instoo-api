import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { EntityManager, Repository } from "typeorm";
import { StreamerHistory } from "../entities/streamer-history.entity";
import { Streamer } from "../entities/streamer.entity";
import { HistoryType } from "@/common/constants/history-type.enum";

@Injectable()
export class StreamerHistoryService {
  constructor(
    @InjectRepository(StreamerHistory)
    private readonly streamerHistoryRepository: Repository<StreamerHistory>,
  ) {}

  /**
   * Streamer 생성 이력 기록
   */
  async recordCreate(streamer: Streamer, modifiedBy: string): Promise<StreamerHistory> {
    const history = this.streamerHistoryRepository.create({
      streamerUuid: streamer.uuid,
      action: HistoryType.CREATE,
      currentData: streamer.toSerializedData(),
      modifiedBy,
    });

    return await this.streamerHistoryRepository.save(history);
  }

  async recordCreateWithTransaction(
    entityManager: EntityManager,
    streamer: Streamer,
    modifiedBy: string,
  ): Promise<StreamerHistory> {
    const history = entityManager.create(StreamerHistory, {
      streamerUuid: streamer.uuid,
      action: HistoryType.CREATE,
      currentData: streamer.toSerializedData(),
      modifiedBy,
    });

    return await entityManager.save(StreamerHistory, history);
  }

  /**
   * Streamer 수정 이력 기록
   */
  async recordUpdate(
    streamer: Streamer,
    previousStreamer: Streamer,
    modifiedBy: string,
  ): Promise<StreamerHistory> {
    const history = this.streamerHistoryRepository.create({
      streamerUuid: streamer.uuid,
      action: HistoryType.UPDATE,
      previousData: previousStreamer.toSerializedData(),
      currentData: streamer.toSerializedData(),
      modifiedBy,
    });

    return await this.streamerHistoryRepository.save(history);
  }

  /**
   * Streamer 수정 이력 기록 (트랜잭션 내에서)
   */
  async recordUpdateWithTransaction(
    entityManager: EntityManager,
    streamer: Streamer,
    previousStreamer: Streamer,
    modifiedBy: string,
  ): Promise<StreamerHistory> {
    const history = entityManager.create(StreamerHistory, {
      streamerUuid: streamer.uuid,
      action: HistoryType.UPDATE,
      previousData: previousStreamer.toSerializedData(),
      currentData: streamer.toSerializedData(),
      modifiedBy,
    });

    return await entityManager.save(StreamerHistory, history);
  }

  /**
   * Streamer 삭제 이력 기록
   */
  async recordDelete(streamer: Streamer, modifiedBy: string): Promise<StreamerHistory> {
    const history = this.streamerHistoryRepository.create({
      streamerUuid: streamer.uuid,
      action: HistoryType.DELETE,
      previousData: streamer.toSerializedData(),
      modifiedBy,
    });

    return await this.streamerHistoryRepository.save(history);
  }

  /**
   * Streamer 복원 이력 기록
   */
  async recordRestore(streamer: Streamer, modifiedBy: string): Promise<StreamerHistory> {
    const history = this.streamerHistoryRepository.create({
      streamerUuid: streamer.uuid,
      action: HistoryType.RESTORE,
      currentData: streamer.toSerializedData(),
      modifiedBy,
    });

    return await this.streamerHistoryRepository.save(history);
  }
}
