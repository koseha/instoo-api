// src/streamers/services/streamers.service.ts
import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, EntityManager, In, Repository } from "typeorm";
import { Streamer } from "../entities/streamer.entity";
import { StreamerPlatform } from "../entities/streamer-platform.entity";
import { User } from "@/users/entities/user.entity";
import { CreateStreamerDto } from "../dto/create-streamer.dto";
import { UpdateStreamerDto } from "../dto/update-streamer.dto";
import { GetStreamersDto } from "../dto/get-streamers.dto";
import {
  StreamerResponseDto,
  PagedStreamerResponseDto,
  StreamerSimpleDto,
} from "../dto/streamer-response.dto";
import { UserRole } from "@/common/constants/user-role.enum";
import { StreamerHistoryService } from "./streamer-history.service";
import {
  ApiException,
  ApiNotFoundException,
  ApiConflictException,
  ApiForbiddenException,
} from "@/common/exceptions/api-exceptions";
import { StreamerErrorCode, UserErrorCode } from "@/common/constants/api-error.enum";
import { TimeUtils } from "@/common/utils/time.utils";
import { StreamerFollow } from "../entities/streamer-follow.entity";

@Injectable()
export class StreamersService {
  constructor(
    @InjectRepository(Streamer)
    private readonly streamerRepository: Repository<Streamer>,
    @InjectRepository(StreamerPlatform)
    private readonly streamerPlatformRepository: Repository<StreamerPlatform>,
    @InjectRepository(StreamerFollow)
    private readonly streamerFollowRepository: Repository<StreamerFollow>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private dataSource: DataSource,
    private readonly streamerHistoryService: StreamerHistoryService,
  ) {}

  /**
   * 방송인 신규 등록
   */
  async create(
    createStreamerDto: CreateStreamerDto,
    userUuid: string,
  ): Promise<StreamerResponseDto> {
    return await this.dataSource.transaction(async (manager) => {
      // 트랜잭션 내에서 사용할 repository들
      const userRepository = manager.getRepository(User);
      const streamerRepository = manager.getRepository(Streamer);

      // 사용자 조회
      const user = await userRepository.findOne({
        where: { uuid: userUuid, isActive: true },
      });
      if (!user) {
        throw new ApiNotFoundException(UserErrorCode.USER_NOT_FOUND);
      }

      // 중복 확인: 이름과 플랫폼 조합으로 체크
      if (Array.isArray(createStreamerDto.platforms) && createStreamerDto.platforms.length > 0) {
        for (const platformDto of createStreamerDto.platforms) {
          const existingStreamer = await this.findByNameAndPlatformInTransaction(
            createStreamerDto.name,
            platformDto.platformName,
            manager,
          );
          if (existingStreamer) {
            throw new ApiConflictException(StreamerErrorCode.STREAMER_ALREADY_EXISTS);
          }
        }
      }

      // Streamer 생성
      const streamer = streamerRepository.create({
        ...createStreamerDto,
        createdBy: userUuid,
        updatedBy: userUuid,
      });

      const savedStreamer = await streamerRepository.save(streamer);

      // 생성 이력 기록
      await this.streamerHistoryService.recordCreateWithTransaction(
        manager,
        savedStreamer,
        userUuid,
      );

      // 트랜잭션 내에서 결과 조회
      return this.findOneInTransaction(savedStreamer.uuid, manager);
    });
  }

  // 트랜잭션 내에서 사용할 헬퍼 메서드들
  private async findByNameAndPlatformInTransaction(
    name: string,
    platformName: string,
    manager: EntityManager,
  ) {
    const streamerRepository = manager.getRepository(Streamer);

    return await streamerRepository
      .createQueryBuilder("streamer")
      .innerJoin("streamer.platforms", "platform")
      .where("streamer.name = :name", { name })
      .andWhere("platform.platformName = :platformName", { platformName })
      .getOne();
  }

  private async findOneInTransaction(
    uuid: string,
    manager: EntityManager,
  ): Promise<StreamerResponseDto> {
    const streamerRepository = manager.getRepository(Streamer);

    const streamer = await streamerRepository.findOne({
      where: { uuid },
      relations: ["platforms"], // 필요한 관계 포함
    });

    if (!streamer) {
      throw new ApiNotFoundException(StreamerErrorCode.STREAMER_NOT_FOUND);
    }

    return StreamerResponseDto.of(streamer); // 또는 적절한 DTO 변환
  }

  /**
   * 방송인 목록 조회 - 간편 검색
   */
  async searchStreamersByName(qName: string): Promise<StreamerSimpleDto[]> {
    if (!qName || qName.trim().length < 2) {
      throw new ApiException(StreamerErrorCode.STREAMER_SEARCH_TERM_TOO_SHORT);
    }

    const queryBuilder = this.streamerRepository
      .createQueryBuilder("streamer")
      .leftJoinAndSelect("streamer.platforms", "platform")
      .where("streamer.isActive = :isActive", { isActive: true })
      .andWhere("streamer.isVerified = :isVerified", { isVerified: true })
      .andWhere("streamer.name ILIKE :name", {
        name: `%${qName.trim()}%`,
      })
      .limit(5);

    const streamers = await queryBuilder.getMany();

    return streamers.map((m) => StreamerSimpleDto.of(m));
  }

  /**
   * uuid로 방송인 간단 조회
   */
  async getSimpleByUuid(uuid: string): Promise<StreamerSimpleDto> {
    const streamer = await this.streamerRepository.findOne({
      where: {
        uuid,
        isActive: true,
        isVerified: true,
      },
      relations: ["platforms"],
    });

    if (!streamer) {
      throw new NotFoundException(`Streamer with uuid ${uuid} not found`);
    }

    return StreamerSimpleDto.of(streamer);
  }

  /**
   * 여러 uuid로 방송인 배치 조회 (선택사항)
   */
  async getSimpleByUuids(uuids: string[]): Promise<StreamerSimpleDto[]> {
    if (uuids.length === 0) {
      return [];
    }

    const streamers = await this.streamerRepository.find({
      where: {
        uuid: In(uuids),
        isActive: true,
        isVerified: true,
      },
      relations: ["platforms"],
    });

    return streamers.map((streamer) => StreamerSimpleDto.of(streamer));
  }

  /**
   * 방송인 목록 조회
   * - 페이지네이션
   */
  async findAll(body: GetStreamersDto): Promise<PagedStreamerResponseDto> {
    const {
      qName,
      isVerified,
      platforms,
      followCount,
      createdAt,
      updatedAt,
      verifiedAt,
      page,
      size,
    } = body;

    // 쿼리 빌더 생성
    const queryBuilder = this.streamerRepository
      .createQueryBuilder("streamer")
      .leftJoinAndSelect("streamer.platforms", "platform")
      .leftJoinAndSelect("streamer.createdByUser", "createdByUser")
      .leftJoinAndSelect("streamer.updatedByUser", "updatedByUser")
      .where("streamer.isActive = :isActive", { isActive: true });

    // 인증 상태 필터링
    if (isVerified !== undefined) {
      queryBuilder.andWhere("streamer.isVerified = :isVerified", { isVerified });
    }

    // 플랫폼 필터링
    if (platforms && platforms.length > 0) {
      queryBuilder.andWhere("platform.platformName IN (:...platforms)", { platforms });
    }

    // 이름 검색 필터링
    if (qName && qName.trim().length > 0) {
      queryBuilder.andWhere("streamer.name ILIKE :qName", {
        qName: `%${qName.trim()}%`,
      });
    }

    // 정렬 조건 적용
    const orderConditions: { [key: string]: "ASC" | "DESC" } = {};

    if (followCount) {
      orderConditions["streamer.followCount"] = followCount.toUpperCase() as "ASC" | "DESC";
    }

    if (createdAt) {
      orderConditions["streamer.createdAt"] = createdAt.toUpperCase() as "ASC" | "DESC";
    }

    if (updatedAt) {
      orderConditions["streamer.updatedAt"] = updatedAt.toUpperCase() as "ASC" | "DESC";
    }

    if (verifiedAt) {
      // verifiedAt는 별도 컬럼이 없으므로 updatedAt으로 대체하거나
      // 인증된 방송인의 updatedAt으로 처리
      queryBuilder.andWhere("streamer.isVerified = :verified", { verified: isVerified ?? true });
      orderConditions["streamer.updatedAt"] = verifiedAt.toUpperCase() as "ASC" | "DESC";
    }

    // 정렬 조건이 없으면 기본 정렬 적용
    if (Object.keys(orderConditions).length === 0) {
      orderConditions["streamer.createdAt"] = "DESC";
    }

    // 정렬 조건 적용
    Object.entries(orderConditions).forEach(([column, direction]) => {
      queryBuilder.addOrderBy(column, direction);
    });

    // 페이지네이션 적용
    const skip = (page - 1) * size;
    queryBuilder.skip(skip).take(size);

    // 데이터 조회
    const [streamers, totalCount] = await queryBuilder.getManyAndCount();

    // DTO 변환
    const data = streamers.map((streamer) => StreamerResponseDto.of(streamer));

    return {
      size,
      page,
      totalCount,
      data,
    };
  }

  /**
   * UUID로 방송인 조회
   */
  async findByUuid(uuid: string, userUuid?: string): Promise<StreamerResponseDto> {
    const streamer = await this.streamerRepository.findOne({
      where: { uuid, isActive: true },
      relations: ["platforms", "createdByUser", "updatedByUser"],
    });

    if (!streamer) {
      throw new ApiNotFoundException(StreamerErrorCode.STREAMER_NOT_FOUND);
    }

    let isFollowed = false;

    if (userUuid) {
      const followedEntity = await this.streamerFollowRepository.findOne({
        where: {
          streamerUuid: uuid,
          userUuid: userUuid,
        },
      });

      isFollowed = !!followedEntity;
    }

    return this.toResponseDto(streamer, isFollowed);
  }

  /**
   * 방송인 정보 수정 (충돌 방지 기능 포함)
   */
  async update(
    uuid: string,
    updateStreamerDto: UpdateStreamerDto,
    userUuid: string,
    _userRole: UserRole,
  ): Promise<StreamerResponseDto> {
    return await this.dataSource.transaction(async (transactionalEntityManager) => {
      // 사용자 조회
      const user = await transactionalEntityManager.findOne(User, {
        where: { uuid: userUuid, isActive: true },
      });
      if (!user) {
        throw new ApiNotFoundException(UserErrorCode.USER_NOT_FOUND);
      }

      // 기존 방송인 정보 조회 (이력 기록용)
      const existingStreamer = await transactionalEntityManager.findOne(Streamer, {
        where: { uuid, isActive: true },
        relations: ["platforms"],
      });
      const previousStreamer = Object.assign(new Streamer(), existingStreamer);

      if (!existingStreamer) {
        throw new ApiNotFoundException(StreamerErrorCode.STREAMER_NOT_FOUND);
      }

      // 충돌 방지: updatedAt 체크
      const requestLastUpdatedAt = new Date(updateStreamerDto.lastUpdatedAt);
      const currentLastUpdatedAt = existingStreamer.updatedAt;

      if (requestLastUpdatedAt.getTime() !== currentLastUpdatedAt.getTime()) {
        throw new ApiConflictException(StreamerErrorCode.STREAMER_CONFLICT_MODIFIED);
      }

      // 이름 변경 시 중복 확인
      if (updateStreamerDto.name && updateStreamerDto.name !== existingStreamer.name) {
        const duplicateStreamer = await transactionalEntityManager.findOne(Streamer, {
          where: { name: updateStreamerDto.name, isActive: true },
        });
        if (duplicateStreamer && duplicateStreamer.uuid !== uuid) {
          throw new ApiConflictException(StreamerErrorCode.STREAMER_NAME_ALREADY_EXISTS);
        }
      }

      // 기본 정보 업데이트
      Object.assign(existingStreamer, {
        name: updateStreamerDto.name ?? existingStreamer.name,
        profileImageUrl: updateStreamerDto.profileImageUrl ?? existingStreamer.profileImageUrl,
        description: updateStreamerDto.description ?? existingStreamer.description,
        updatedBy: user.uuid,
        version: existingStreamer.version + 1,
      });

      await transactionalEntityManager.save(Streamer, existingStreamer);

      // 플랫폼 정보 업데이트 (기존 완전 삭제 → 신규 저장)
      if (updateStreamerDto.platforms !== undefined) {
        // 기존 플랫폼 완전 삭제 (하드 delete)
        await transactionalEntityManager.delete(StreamerPlatform, {
          streamerUuid: existingStreamer.uuid,
        });

        // 새 플랫폼 추가
        if (updateStreamerDto.platforms.length > 0) {
          const newPlatforms = updateStreamerDto.platforms.map((platformDto) =>
            transactionalEntityManager.create(StreamerPlatform, {
              platformName: platformDto.platformName,
              channelUrl: platformDto.channelUrl,
              streamerUuid: existingStreamer.uuid,
            }),
          );
          await transactionalEntityManager.save(StreamerPlatform, newPlatforms);
        }
      }

      // 수정 이력 기록
      await this.streamerHistoryService.recordUpdateWithTransaction(
        transactionalEntityManager,
        existingStreamer,
        previousStreamer,
        userUuid,
      );

      return this.findByUuid(uuid);
    });
  }

  /**
   * 방송인 삭제 (관리자만 가능)
   */
  async remove(uuid: string, userUuid: string, userRole: UserRole): Promise<void> {
    // 권한 확인
    if (userRole !== UserRole.ADMIN) {
      throw new ApiForbiddenException(StreamerErrorCode.STREAMER_DELETE_ADMIN_ONLY);
    }

    // 방송인 조회
    const streamer = await this.streamerRepository.findOne({
      where: { uuid, isActive: true },
    });

    if (!streamer) {
      throw new ApiNotFoundException(StreamerErrorCode.STREAMER_NOT_FOUND);
    }

    // Soft delete
    streamer.isActive = false;
    await this.streamerRepository.save(streamer);

    // 플랫폼도 비활성화
    await this.streamerPlatformRepository.update(
      { streamerUuid: streamer.uuid },
      { isActive: false },
    );
  }

  /**
   * 방송인 인증 상태 변경 (관리자만 가능)
   */
  async verifyStreamer(uuid: string, isVerified: boolean): Promise<StreamerResponseDto> {
    const streamer = await this.streamerRepository.findOne({
      where: { uuid, isActive: true },
    });

    if (!streamer) {
      throw new ApiNotFoundException(StreamerErrorCode.STREAMER_NOT_FOUND);
    }

    streamer.isVerified = isVerified;
    // 인증 상태에 따라 verifiedAt 설정
    if (isVerified) {
      // 인증 시: 현재 시간을 UTC로 저장
      streamer.verifiedAt = new Date();
    } else {
      // 인증 해제 시: null로 설정
      streamer.verifiedAt = null;
    }
    await this.streamerRepository.save(streamer);

    return this.findByUuid(uuid);
  }

  /**
   * 이름과 플랫폼으로 방송인 찾기 (중복 확인용)
   */
  private async findByNameAndPlatform(
    name: string,
    platformName: string,
  ): Promise<Streamer | null> {
    return this.streamerRepository
      .createQueryBuilder("streamer")
      .leftJoinAndSelect("streamer.platforms", "platform")
      .where("streamer.name = :name", { name })
      .andWhere("platform.platformName = :platformName", { platformName })
      .andWhere("streamer.isActive = true")
      .andWhere("platform.isActive = true")
      .getOne();
  }

  /**
   * Entity를 ResponseDto로 변환
   */
  private toResponseDto(streamer: Streamer, isFollowed: boolean = false): StreamerResponseDto {
    return StreamerResponseDto.of(streamer, isFollowed);
  }
}
