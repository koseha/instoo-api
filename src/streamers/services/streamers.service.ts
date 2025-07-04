// src/streamers/services/streamers.service.ts
import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Streamer } from "../entities/streamer.entity";
import { StreamerPlatform } from "../entities/streamer-platform.entity";
import { User } from "@/users/entities/user.entity";
import { CreateStreamerDto } from "../dto/create-streamer.dto";
import { UpdateStreamerDto } from "../dto/update-streamer.dto";
import { QueryStreamersDto } from "../dto/query-streamers.dto";
import {
  StreamerResponseDto,
  PagedStreamerResponseDto,
  StreamerPageCursorDto,
} from "../dto/streamer-response.dto";
import { UserRole } from "@/common/constants/user-role.enum";

@Injectable()
export class StreamersService {
  constructor(
    @InjectRepository(Streamer)
    private readonly streamerRepository: Repository<Streamer>,
    @InjectRepository(StreamerPlatform)
    private readonly streamerPlatformRepository: Repository<StreamerPlatform>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * 방송인 신규 등록
   */
  async create(
    createStreamerDto: CreateStreamerDto,
    userUuid: string,
  ): Promise<StreamerResponseDto> {
    // 사용자 조회
    const user = await this.userRepository.findOne({
      where: { uuid: userUuid, isActive: true },
    });
    if (!user) {
      throw new NotFoundException("사용자를 찾을 수 없습니다.");
    }

    // 중복 확인: 이름과 플랫폼 조합으로 체크
    if (Array.isArray(createStreamerDto.platforms) && createStreamerDto.platforms.length > 0) {
      for (const platformDto of createStreamerDto.platforms) {
        const existingStreamer = await this.findByNameAndPlatform(
          createStreamerDto.name,
          platformDto.platformName,
        );
        if (existingStreamer) {
          throw new ConflictException(
            `방송인 "${createStreamerDto.name}"이 플랫폼 "${platformDto.platformName}"에 이미 존재합니다.`,
          );
        }
      }
    }

    // Streamer 생성
    const streamer = this.streamerRepository.create({
      ...createStreamerDto,
      createdBy: user.id,
      updatedBy: user.id,
    });

    const savedStreamer = await this.streamerRepository.save(streamer);

    // 플랫폼 정보 저장
    if (Array.isArray(createStreamerDto.platforms) && createStreamerDto.platforms.length > 0) {
      const platforms = createStreamerDto.platforms.map((platformDto) =>
        this.streamerPlatformRepository.create({
          platformName: platformDto.platformName,
          channelUrl: platformDto.channelUrl,
          streamerUuid: savedStreamer.uuid,
        }),
      );
      await this.streamerPlatformRepository.save(platforms);
    }

    return this.findOne(savedStreamer.id);
  }

  /**
   * 방송인 목록 조회 (무한 스크롤링)
   */
  async findAll(query: QueryStreamersDto): Promise<PagedStreamerResponseDto> {
    const {
      name,
      platform,
      isVerified,
      isActive,
      cursorId,
      cursorValue,
      limit = 20,
      sortBy = "id",
      sortOrder = "DESC",
    } = query;

    const queryBuilder = this.streamerRepository
      .createQueryBuilder("streamer")
      .leftJoinAndSelect("streamer.platforms", "platform")
      .leftJoinAndSelect("streamer.createdByUser", "createdByUser")
      .leftJoinAndSelect("streamer.updatedByUser", "updatedByUser")
      .where("streamer.isActive = :isActive", { isActive: isActive ?? true });

    // 검색 조건 추가
    if (name?.trim()) {
      queryBuilder.andWhere("streamer.name ILIKE :name", {
        name: `%${name.trim()}%`,
      });
    }

    if (platform?.trim()) {
      queryBuilder.andWhere("platform.platformName = :platform", {
        platform: platform.trim(),
      });
    }

    if (isVerified !== undefined) {
      queryBuilder.andWhere("streamer.isVerified = :isVerified", { isVerified });
    }

    // Cursor-based pagination
    if (cursorId && cursorValue) {
      const operator = sortOrder === "DESC" ? "<" : ">";

      if (sortBy === "id") {
        queryBuilder.andWhere(`streamer.id ${operator} :cursorId`, { cursorId });
      } else if (sortBy === "createdAt" || sortBy === "updatedAt") {
        // 날짜 + ID 복합 정렬
        queryBuilder.andWhere(
          `(streamer.${sortBy} ${operator} :cursorValue OR (streamer.${sortBy} = :cursorValue AND streamer.id ${operator} :cursorId))`,
          { cursorValue: new Date(cursorValue), cursorId },
        );
      } else if (sortBy === "name") {
        // 이름 + ID 복합 정렬
        queryBuilder.andWhere(
          `(streamer.name ${operator} :cursorValue OR (streamer.name = :cursorValue AND streamer.id ${operator} :cursorId))`,
          { cursorValue, cursorId },
        );
      }
    }

    // 정렬
    if (sortBy === "popular") {
      queryBuilder.orderBy("streamer.followCount", "DESC").addOrderBy("streamer.id", sortOrder);
    } else if (sortBy === "id") {
      queryBuilder.orderBy("streamer.id", sortOrder);
    } else {
      queryBuilder.orderBy(`streamer.${sortBy}`, sortOrder).addOrderBy("streamer.id", sortOrder);
    }

    queryBuilder.take(limit + 1);

    const streamers = await queryBuilder.getMany();

    if (!streamers) throw new NotFoundException("등록된 방송인 목록이 존재하지 않습니다.");

    // hasMore 확인
    const hasMore = streamers.length > limit;
    if (hasMore) {
      streamers.pop();
    }

    // nextCursor 설정
    let nextCursor: StreamerPageCursorDto | null = null;
    if (hasMore && streamers.length > 0) {
      const lastItem = streamers[streamers.length - 1];
      let cursorValue: string;

      if (sortBy === "id") {
        cursorValue = lastItem.id.toString();
      } else if (sortBy === "createdAt" || sortBy === "updatedAt") {
        cursorValue = lastItem[sortBy].toISOString();
      } else if (sortBy === "popular") {
        cursorValue = lastItem.followCount.toString();
      } else if (sortBy === "name") {
        cursorValue = lastItem.name || "";
      } else {
        cursorValue = "";
      }

      nextCursor = {
        id: lastItem.id,
        value: cursorValue,
      };
    }

    return {
      size: limit,
      page: {
        next: nextCursor,
        hasMore,
      },
      data: streamers.map((streamer) => this.toResponseDto(streamer)),
    };
  }

  /**
   * ID로 방송인 조회
   */
  async findOne(id: number): Promise<StreamerResponseDto> {
    const streamer = await this.streamerRepository.findOne({
      where: { id, isActive: true },
      relations: ["platforms", "createdByUser", "updatedByUser"],
    });

    if (!streamer) {
      throw new NotFoundException(`방송인을 찾을 수 없습니다. (ID: ${id})`);
    }

    return this.toResponseDto(streamer);
  }

  /**
   * UUID로 방송인 조회
   */
  async findByUuid(uuid: string): Promise<StreamerResponseDto> {
    const streamer = await this.streamerRepository.findOne({
      where: { uuid, isActive: true },
      relations: ["platforms", "createdByUser", "updatedByUser"],
    });

    if (!streamer) {
      throw new NotFoundException(`방송인을 찾을 수 없습니다. (UUID: ${uuid})`);
    }

    return this.toResponseDto(streamer);
  }

  /**
   * 방송인 정보 수정 (충돌 방지 기능 포함)
   */
  async update(
    id: number,
    updateStreamerDto: UpdateStreamerDto,
    userUuid: string,
    _userRole: UserRole,
  ): Promise<StreamerResponseDto> {
    // 사용자 조회
    const user = await this.userRepository.findOne({
      where: { uuid: userUuid, isActive: true },
    });
    if (!user) {
      throw new NotFoundException("사용자를 찾을 수 없습니다.");
    }

    // 기존 방송인 정보 조회
    const streamer = await this.streamerRepository.findOne({
      where: { id, isActive: true },
      relations: ["platforms"],
    });

    if (!streamer) {
      throw new NotFoundException(`방송인을 찾을 수 없습니다. (ID: ${id})`);
    }

    // 충돌 방지: updatedAt 체크
    const requestLastUpdatedAt = new Date(updateStreamerDto.lastUpdatedAt);
    const currentLastUpdatedAt = streamer.updatedAt;

    if (requestLastUpdatedAt.getTime() !== currentLastUpdatedAt.getTime()) {
      throw new ConflictException(
        `방송인 정보가 다른 사용자에 의해 수정되었습니다. 최신 정보를 다시 불러온 후 수정해주세요.`,
      );
    }

    // 이름 변경 시 중복 확인
    if (updateStreamerDto.name && updateStreamerDto.name !== streamer.name) {
      const existingStreamer = await this.streamerRepository.findOne({
        where: { name: updateStreamerDto.name, isActive: true },
      });
      if (existingStreamer && existingStreamer.id !== id) {
        throw new ConflictException(`방송인 이름 "${updateStreamerDto.name}"이 이미 존재합니다.`);
      }
    }

    // 기본 정보 업데이트
    Object.assign(streamer, {
      name: updateStreamerDto.name ?? streamer.name,
      profileImageUrl: updateStreamerDto.profileImageUrl ?? streamer.profileImageUrl,
      description: updateStreamerDto.description ?? streamer.description,
      updatedBy: user.id,
    });

    await this.streamerRepository.save(streamer);

    // 플랫폼 정보 업데이트
    if (updateStreamerDto.platforms !== undefined) {
      // 기존 플랫폼 비활성화
      await this.streamerPlatformRepository.update(
        { streamerUuid: streamer.uuid },
        { isActive: false },
      );

      // 새 플랫폼 추가
      if (updateStreamerDto.platforms.length > 0) {
        const platforms = updateStreamerDto.platforms.map((platformDto) =>
          this.streamerPlatformRepository.create({
            platformName: platformDto.platformName,
            channelUrl: platformDto.channelUrl,
            streamerUuid: streamer.uuid,
          }),
        );
        await this.streamerPlatformRepository.save(platforms);
      }
    }

    return this.findOne(id);
  }

  /**
   * 방송인 삭제 (관리자만 가능)
   */
  async remove(id: number, userUuid: string, userRole: UserRole): Promise<void> {
    // 권한 확인
    if (userRole !== UserRole.ADMIN) {
      throw new ForbiddenException("관리자만 방송인을 삭제할 수 있습니다.");
    }

    // 방송인 조회
    const streamer = await this.streamerRepository.findOne({
      where: { id, isActive: true },
    });

    if (!streamer) {
      throw new NotFoundException(`방송인을 찾을 수 없습니다. (ID: ${id})`);
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
  async verifyStreamer(id: number, isVerified: boolean): Promise<StreamerResponseDto> {
    const streamer = await this.streamerRepository.findOne({
      where: { id, isActive: true },
    });

    if (!streamer) {
      throw new NotFoundException(`방송인을 찾을 수 없습니다. (ID: ${id})`);
    }

    streamer.isVerified = isVerified;
    await this.streamerRepository.save(streamer);

    return this.findOne(id);
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
  private toResponseDto(streamer: Streamer): StreamerResponseDto {
    return StreamerResponseDto.of(streamer);
  }
}
