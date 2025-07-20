// src/schedules/services/schedule-history.service.ts
import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ScheduleLike } from "../entities/schedule-like.entity";
import { Schedule } from "../entities/schedule.entity";

@Injectable()
export class ScheduleLikesService {
  constructor(
    @InjectRepository(ScheduleLike)
    private readonly scheduleLikeRepository: Repository<ScheduleLike>,
    @InjectRepository(Schedule)
    private readonly scheduleRepository: Repository<Schedule>,
  ) {}

  /**
   *
   * @param scheduleUuid
   * @param userUuid
   */
  async addLike(scheduleUuid: string, userUuid: string): Promise<void> {
    // 스케줄 존재 확인
    const schedule = await this.scheduleRepository.findOne({
      where: { uuid: scheduleUuid },
    });
    if (!schedule) {
      throw new NotFoundException("스케줄을 찾을 수 없습니다.");
    }

    // 이미 좋아요했는지 확인
    const existingLike = await this.scheduleLikeRepository.findOne({
      where: { scheduleUuid, userUuid },
    });
    if (existingLike) {
      throw new ConflictException("이미 좋아요를 누른 스케줄입니다.");
    }

    // 트랜잭션으로 좋아요 생성 + likeCount 증가
    await this.scheduleLikeRepository.manager.transaction(async (manager) => {
      // 좋아요 생성
      const like = manager.create(ScheduleLike, {
        scheduleUuid,
        userUuid,
      });
      await manager.save(like);

      // likeCount 증가
      await manager.increment(Schedule, { uuid: scheduleUuid }, "likeCount", 1);
    });
  }

  /**
   *
   * @param scheduleUuid
   * @param userUuid
   */
  async removeLike(scheduleUuid: string, userUuid: string): Promise<void> {
    const like = await this.scheduleLikeRepository.findOne({
      where: { scheduleUuid, userUuid },
    });

    if (!like) {
      throw new NotFoundException("좋아요를 찾을 수 없습니다.");
    }

    // 트랜잭션으로 좋아요 삭제 + likeCount 감소
    await this.scheduleLikeRepository.manager.transaction(async (manager) => {
      // 좋아요 삭제
      await manager.remove(like);

      // likeCount 감소 (0 미만으로 내려가지 않도록)
      await manager.query(
        `
        UPDATE schedules 
        SET "likeCount" = GREATEST("likeCount" - 1, 0)
        WHERE uuid = $1
      `,
        [scheduleUuid],
      );
    });
  }
}
