// src/streamers/services/streamer-follow.service.ts
import { Injectable, NotFoundException, ConflictException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { StreamerFollow } from "../entities/streamer-follow.entity";
import { StreamerFollowHistory, FollowAction } from "../entities/streamer-follow-history.entity";
import { Streamer } from "../entities/streamer.entity";
import { MyStreamerDto } from "@/users/dto/user-response.dto";

@Injectable()
export class StreamerFollowService {
  constructor(
    @InjectRepository(StreamerFollow)
    private readonly streamerFollowRepository: Repository<StreamerFollow>,
    @InjectRepository(StreamerFollowHistory)
    private readonly streamerFollowHistoryRepository: Repository<StreamerFollowHistory>,
    @InjectRepository(Streamer)
    private readonly streamerRepository: Repository<Streamer>,
  ) {}

  /**
   * 스트리머 팔로우
   * @param userUuid 사용자 UUID
   * @param streamerUuid 스트리머 UUID
   */
  async followStreamer(userUuid: string, streamerUuid: string): Promise<void> {
    // 스트리머 존재 확인
    const streamer = await this.streamerRepository.findOne({
      where: { uuid: streamerUuid, isActive: true },
    });
    if (!streamer) {
      throw new NotFoundException("스트리머를 찾을 수 없습니다.");
    }

    // 이미 팔로우 중인지 확인
    const existingFollow = await this.streamerFollowRepository.findOne({
      where: { userUuid, streamerUuid },
    });
    if (existingFollow) {
      throw new ConflictException("이미 팔로우 중인 스트리머입니다.");
    }

    // 트랜잭션으로 팔로우 생성 + followCount 증가 + 히스토리 기록
    await this.streamerFollowRepository.manager.transaction(async (manager) => {
      // 팔로우 생성
      const follow = manager.create(StreamerFollow, {
        userUuid,
        streamerUuid,
      });
      await manager.save(follow);

      // 팔로우 히스토리 기록
      const history = manager.create(StreamerFollowHistory, {
        userUuid,
        streamerUuid,
        action: FollowAction.FOLLOW,
      });
      await manager.save(history);

      // followCount 증가
      await manager.increment(Streamer, { uuid: streamerUuid }, "followCount", 1);
    });
  }

  /**
   * 스트리머 언팔로우
   * @param userUuid 사용자 UUID
   * @param streamerUuid 스트리머 UUID
   */
  async unfollowStreamer(userUuid: string, streamerUuid: string): Promise<void> {
    const follow = await this.streamerFollowRepository.findOne({
      where: { userUuid, streamerUuid },
    });

    if (!follow) {
      throw new NotFoundException("팔로우 관계를 찾을 수 없습니다.");
    }

    // 트랜잭션으로 팔로우 삭제 + followCount 감소 + 히스토리 기록
    await this.streamerFollowRepository.manager.transaction(async (manager) => {
      // 팔로우 삭제
      await manager.remove(follow);

      // 언팔로우 히스토리 기록
      const history = manager.create(StreamerFollowHistory, {
        userUuid,
        streamerUuid,
        action: FollowAction.UNFOLLOW,
      });
      await manager.save(history);

      // followCount 감소 (0 미만으로 내려가지 않도록)
      await manager.query(
        `
        UPDATE streamers 
        SET "followCount" = GREATEST("followCount" - 1, 0)
        WHERE uuid = $1
      `,
        [streamerUuid],
      );
    });
  }

  /**
   * 팔로우 상태 확인
   * @param userUuid 사용자 UUID
   * @param streamerUuid 스트리머 UUID
   */
  async isFollowing(userUuid: string, streamerUuid: string): Promise<boolean> {
    const follow = await this.streamerFollowRepository.findOne({
      where: { userUuid, streamerUuid },
    });
    return !!follow;
  }

  /**
   * 유저의 팔로우 히스토리 조회
   * @param userUuid 사용자 UUID
   * @param limit 조회 개수
   */
  async getUserFollowHistory(userUuid: string, limit: number = 20) {
    return this.streamerFollowHistoryRepository.find({
      where: { userUuid },
      relations: ["streamer"],
      order: { createdAt: "DESC" },
      take: limit,
    });
  }

  /**
   * 스트리머의 팔로우 히스토리 조회 (관리자용)
   * @param streamerUuid 스트리머 UUID
   * @param limit 조회 개수
   */
  async getStreamerFollowHistory(streamerUuid: string, limit: number = 50) {
    return this.streamerFollowHistoryRepository.find({
      where: { streamerUuid },
      relations: ["user"],
      order: { createdAt: "DESC" },
      take: limit,
    });
  }

  /**
   * 팔로우 상태 배치 업데이트 (on/off 상태)
   * @param userUuid 사용자 UUID
   * @param updates 업데이트할 상태 목록
   */
  async batchUpdateFollowStatus(
    userUuid: string,
    updates: { streamerUuid: string; isActive: boolean }[],
  ): Promise<void> {
    if (updates.length === 0) return;

    // 트랜잭션으로 배치 업데이트
    await this.streamerFollowRepository.manager.transaction(async (manager) => {
      for (const update of updates) {
        // 팔로우 관계가 존재하는지 확인
        const follow = await manager.findOne(StreamerFollow, {
          where: { userUuid, streamerUuid: update.streamerUuid },
        });

        if (follow) {
          // 팔로우 관계가 있으면 isActive 상태 업데이트
          follow.isActive = update.isActive;
          await manager.save(follow);
        }
        // 팔로우 관계가 없으면 무시 (에러 발생시키지 않음)
      }
    });
  }

  /**
   * 사용자의 모든 팔로우 목록 조회 (MyStreamers용)
   * @param userUuid 사용자 UUID
   * @returns 팔로우 중인 스트리머 목록 + 상태 정보
   */
  async getMyStreamers(userUuid: string): Promise<MyStreamerDto[]> {
    const streamerFollows = await this.streamerFollowRepository.find({
      where: { userUuid },
      relations: ["streamer", "streamer.platforms"], // platforms 관계 추가
      select: {
        isActive: true,
        createdAt: true,
        streamer: {
          uuid: true,
          name: true,
          profileImageUrl: true,
          platforms: true, // 전체 platforms 정보 필요
          followCount: true,
        },
      },
      order: {
        isActive: "DESC", // true 먼저
        updatedAt: "DESC", // 최신 순
      },
    });

    return streamerFollows.map((follow) => MyStreamerDto.of(follow));
  }
}
