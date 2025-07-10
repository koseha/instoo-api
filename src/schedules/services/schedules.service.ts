// src/schedules/services/schedules.service.ts
import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Schedule } from "../entities/schedule.entity";
import { Repository } from "typeorm";
import { Streamer } from "@/streamers/entities/streamer.entity";
import { User } from "@/users/entities/user.entity";
import { CreateScheduleDto } from "../dto/create-schedule.dto";
import { QuerySchedulesDto } from "../dto/query-schedules.dto";
import {
  PagedScheduleResponseDto,
  ScheduleCursorDto,
  ScheduleResponseDto,
} from "../dto/schedule-response.dto";
import { UpdateScheduleDto } from "../dto/update-schedule.dto";
import { UserRole } from "@/common/constants/user-role.enum";

@Injectable()
export class SchedulesService {
  constructor(
    @InjectRepository(Schedule)
    private readonly scheduleRepository: Repository<Schedule>,
    @InjectRepository(Streamer)
    private readonly streamerRepository: Repository<Streamer>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * 일정 등록
   */
  async create(
    createScheduleDto: CreateScheduleDto,
    userUuid: string,
  ): Promise<ScheduleResponseDto> {
    // 1. 사용자 조회
    const user = await this.userRepository.findOne({
      where: { uuid: userUuid },
    });

    if (!user) {
      throw new NotFoundException("사용자를 찾을 수 없습니다.");
    }

    // 2. 스트리머 조회
    const streamer = await this.streamerRepository.findOne({
      where: { uuid: createScheduleDto.streamerUuid },
    });

    if (!streamer) {
      throw new NotFoundException("스트리머를 찾을 수 없습니다.");
    }

    // 3. 날짜 변환
    const scheduleDate = new Date(createScheduleDto.scheduleDate);
    let startTime: Date | undefined;

    if (
      createScheduleDto.startTime &&
      !createScheduleDto.isTimeUndecided &&
      !createScheduleDto.isBreak
    ) {
      startTime = new Date(createScheduleDto.startTime);
    }

    // 4. 비즈니스 로직 검증
    await this.validateScheduleCreation(
      streamer.id,
      scheduleDate,
      startTime,
      createScheduleDto.isTimeUndecided || false,
      createScheduleDto.isBreak || false,
    );

    // 5. 일정 생성
    const schedule = this.scheduleRepository.create({
      title: createScheduleDto.title,
      scheduleDate,
      startTime,
      isTimeUndecided: createScheduleDto.isTimeUndecided || false,
      isBreak: createScheduleDto.isBreak || false,
      description: createScheduleDto.description,
      streamer,
      createdByUser: user,
      updatedByUser: user,
      version: 1,
    });

    // 6. 저장
    const savedSchedule = await this.scheduleRepository.save(schedule);

    // 7. 저장된 일정 조회 (관계 데이터 포함)
    const result = await this.scheduleRepository.findOne({
      where: { id: savedSchedule.id },
      relations: ["streamer", "createdByUser", "updatedByUser"],
    });

    if (!result) {
      throw new InternalServerErrorException("일정 생성 중 오류가 발생했습니다.");
    }

    // 8. DTO 변환 후 반환
    return ScheduleResponseDto.of(result);
  }

  /**
   * 일정 생성 시 비즈니스 로직 검증
   */
  private async validateScheduleCreation(
    streamerId: number,
    scheduleDate: Date,
    startTime: Date | undefined,
    isTimeUndecided: boolean,
    isBreak: boolean,
  ): Promise<void> {
    // 해당 방송일의 기존 일정들 조회
    const existingSchedules = await this.scheduleRepository.find({
      where: {
        streamer: { id: streamerId },
        scheduleDate: scheduleDate,
      },
      order: { startTime: "ASC" },
    });

    // 휴방 관련 검증
    if (isBreak) {
      // 해당 방송일에 다른 일정이 존재하면 휴방 일정 등록 불가
      if (existingSchedules.length > 0) {
        throw new ConflictException(
          "해당 방송일에 이미 다른 일정이 존재하여 휴방 일정을 등록할 수 없습니다.",
        );
      }
    } else {
      // 휴방이 아닌 경우, 해당 방송일에 휴방 일정이 있으면 등록 불가
      const hasBreakSchedule = existingSchedules.some((schedule) => schedule.isBreak);
      if (hasBreakSchedule) {
        throw new ConflictException(
          "해당 방송일에 휴방 일정이 존재하여 다른 일정을 등록할 수 없습니다.",
        );
      }
    }

    // 방송일 기준 최대 2개 일정 제한
    if (existingSchedules.length >= 2) {
      throw new ConflictException("방송일 기준으로 최대 2개의 일정만 등록할 수 있습니다.");
    }

    // 시간 미정 관련 검증
    if (isTimeUndecided) {
      const timeUndecidedCount = existingSchedules.filter(
        (schedule) => schedule.isTimeUndecided,
      ).length;
      if (timeUndecidedCount >= 2) {
        throw new ConflictException("해당 방송일에 시간 미정 일정은 2개 이상 등록할 수 없습니다.");
      }
    }

    // 시작 시간 중복 검증 (시간이 지정된 경우만)
    if (startTime && !isTimeUndecided && !isBreak) {
      for (const existingSchedule of existingSchedules) {
        if (
          existingSchedule.startTime &&
          !existingSchedule.isTimeUndecided &&
          !existingSchedule.isBreak
        ) {
          const timeDiff = Math.abs(startTime.getTime() - existingSchedule.startTime.getTime());
          const hoursDiff = timeDiff / (1000 * 60 * 60); // 밀리초를 시간으로 변환

          // ±2시간 이내에 다른 일정이 있으면 등록 불가
          if (hoursDiff < 2) {
            throw new ConflictException(
              "시작 시간 기준 ±2시간 이내에 다른 일정이 존재하여 등록할 수 없습니다.",
            );
          }
        }
      }
    }
  }

  /**
   * 일정 목록 조회 (커서 기반 페이지네이션)
   */
  async findAll(query: QuerySchedulesDto): Promise<PagedScheduleResponseDto> {
    const {
      streamerUuids,
      startDate,
      endDate,
      title,
      isTimeUndecided,
      isBreak,
      cursorDate,
      cursorStartTime,
      cursorId,
      limit = 20,
      sortBy = "scheduleDate",
      sortOrder = "ASC",
    } = query;

    const queryBuilder = this.scheduleRepository
      .createQueryBuilder("schedule")
      .leftJoinAndSelect("schedule.streamer", "streamer")
      .leftJoinAndSelect("schedule.createdByUser", "createdByUser")
      .leftJoinAndSelect("schedule.updatedByUser", "updatedByUser")
      .where("streamer.isActive = :isActive", { isActive: true });

    // 검색 조건 추가
    if (streamerUuids && streamerUuids.length > 0) {
      queryBuilder.andWhere("schedule.streamerUuid IN (:...streamerUuids)", { streamerUuids });
    }

    if (startDate) {
      queryBuilder.andWhere("schedule.scheduleDate >= :startDate", {
        startDate: new Date(startDate),
      });
    }

    if (endDate) {
      queryBuilder.andWhere("schedule.scheduleDate <= :endDate", {
        endDate: new Date(endDate),
      });
    }

    if (title?.trim()) {
      queryBuilder.andWhere("schedule.title ILIKE :title", {
        title: `%${title.trim()}%`,
      });
    }

    if (isTimeUndecided !== undefined) {
      queryBuilder.andWhere("schedule.isTimeUndecided = :isTimeUndecided", { isTimeUndecided });
    }

    if (isBreak !== undefined) {
      queryBuilder.andWhere("schedule.isBreak = :isBreak", { isBreak });
    }

    // 커서 기반 페이지네이션
    if (cursorDate && cursorId) {
      const operator = sortOrder === "DESC" ? "<" : ">";

      if (sortBy === "scheduleDate") {
        // 복합 커서: scheduleDate + startTime + id
        let cursorCondition = `(schedule.scheduleDate ${operator} :cursorDate)`;

        if (cursorStartTime !== undefined) {
          cursorCondition += ` OR (schedule.scheduleDate = :cursorDate AND (`;

          if (cursorStartTime === null) {
            cursorCondition += `schedule.startTime IS NOT NULL OR (schedule.startTime IS NULL AND schedule.id ${operator} :cursorId)`;
          } else {
            cursorCondition += `schedule.startTime ${operator} :cursorStartTime OR (schedule.startTime = :cursorStartTime AND schedule.id ${operator} :cursorId)`;
          }

          cursorCondition += `))`;
        } else {
          cursorCondition += ` OR (schedule.scheduleDate = :cursorDate AND schedule.id ${operator} :cursorId)`;
        }

        queryBuilder.andWhere(`(${cursorCondition})`, {
          cursorDate: new Date(cursorDate),
          cursorStartTime: cursorStartTime ? new Date(`${cursorDate}T${cursorStartTime}`) : null,
          cursorId,
        });
      } else {
        // 다른 정렬 기준일 때는 단순하게 처리
        queryBuilder.andWhere(`schedule.id ${operator} :cursorId`, { cursorId });
      }
    }

    // 정렬 (일정 표시 우선순위에 따라)
    if (sortBy === "scheduleDate") {
      queryBuilder
        .addSelect(
          `
          CASE
            WHEN schedule.isBreak = true THEN 0
            WHEN schedule.isTimeUndecided = true THEN 1
            ELSE 2
          END
        `,
          "schedule_priority",
        )
        .orderBy("schedule.scheduleDate", sortOrder)
        .addOrderBy("schedule_priority", "ASC")
        .addOrderBy("schedule.startTime", "ASC")
        .addOrderBy("schedule.id", sortOrder);
    } else {
      queryBuilder.orderBy(`schedule.${sortBy}`, sortOrder).addOrderBy("schedule.id", sortOrder);
    }

    queryBuilder.take(limit + 1);

    const schedules = await queryBuilder.getMany();

    // hasMore 확인
    const hasMore = schedules.length > limit;
    if (hasMore) {
      schedules.pop();
    }

    // nextCursor 설정
    let nextCursor: ScheduleCursorDto | null = null;
    if (hasMore && schedules.length > 0) {
      const lastItem = schedules[schedules.length - 1];
      nextCursor = {
        scheduleDate: lastItem.scheduleDate.toISOString().split("T")[0],
        startTime: lastItem.startTime
          ? lastItem.startTime.toISOString().split("T")[1].split(".")[0]
          : null,
        id: lastItem.id,
      };
    }

    return {
      size: limit,
      page: {
        next: nextCursor,
        hasMore,
      },
      data: schedules.map((schedule) => ScheduleResponseDto.of(schedule)),
    };
  }

  /**
   * ID로 일정 상세 조회
   */
  async findOne(id: number): Promise<ScheduleResponseDto> {
    const schedule = await this.scheduleRepository.findOne({
      where: { id },
      relations: ["streamer", "createdByUser", "updatedByUser"],
    });

    if (!schedule) {
      throw new NotFoundException(`일정을 찾을 수 없습니다. (ID: ${id})`);
    }

    return ScheduleResponseDto.of(schedule);
  }

  /**
   * UUID로 일정 상세 조회
   */
  async findByUuid(uuid: string): Promise<ScheduleResponseDto> {
    const schedule = await this.scheduleRepository.findOne({
      where: { uuid },
      relations: ["streamer", "createdByUser", "updatedByUser"],
    });

    if (!schedule) {
      throw new NotFoundException(`일정을 찾을 수 없습니다. (UUID: ${uuid})`);
    }

    return ScheduleResponseDto.of(schedule);
  }

  /**
   * 일정 수정 (충돌 방지 포함)
   */
  async update(
    id: number,
    updateScheduleDto: UpdateScheduleDto,
    userUuid: string,
    userRole: UserRole,
  ): Promise<ScheduleResponseDto> {
    // 사용자 조회
    const user = await this.userRepository.findOne({
      where: { uuid: userUuid, isActive: true },
    });
    if (!user) {
      throw new NotFoundException("사용자를 찾을 수 없습니다.");
    }

    // 기존 일정 조회
    const schedule = await this.scheduleRepository.findOne({
      where: { id },
      relations: ["streamer"],
    });

    if (!schedule) {
      throw new NotFoundException(`일정을 찾을 수 없습니다. (ID: ${id})`);
    }

    // 과거 일정 수정 권한 확인 (관리자만 가능)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (schedule.scheduleDate < today && userRole !== UserRole.ADMIN) {
      throw new ForbiddenException("과거 일정은 관리자만 수정할 수 있습니다.");
    }

    // 충돌 방지: lastUpdatedAt 체크
    const requestLastUpdatedAt = new Date(updateScheduleDto.lastUpdatedAt);
    const currentLastUpdatedAt = schedule.updatedAt;

    if (requestLastUpdatedAt.getTime() !== currentLastUpdatedAt.getTime()) {
      throw new ConflictException(
        "일정이 다른 사용자에 의해 수정되었습니다. 최신 정보를 다시 불러온 후 수정해주세요.",
      );
    }

    // 수정 데이터 적용
    const updateData: Partial<Schedule> = {
      updatedBy: user.id,
    };

    if (updateScheduleDto.title !== undefined) {
      updateData.title = updateScheduleDto.title;
    }

    if (updateScheduleDto.isBreak !== undefined) {
      updateData.isBreak = updateScheduleDto.isBreak;
    }

    if (updateScheduleDto.isTimeUndecided !== undefined) {
      updateData.isTimeUndecided = updateScheduleDto.isTimeUndecided;
    }

    if (updateScheduleDto.description !== undefined) {
      updateData.description = updateScheduleDto.description;
    }

    // startTime 처리
    if (!updateData.isBreak && !updateData.isTimeUndecided && updateScheduleDto.startTime) {
      updateData.startTime = new Date(updateScheduleDto.startTime);
    } else if (updateData.isBreak || updateData.isTimeUndecided) {
      updateData.startTime = null;
    }

    // 수정 실행
    Object.assign(schedule, updateData);
    await this.scheduleRepository.save(schedule);

    return this.findOne(id);
  }

  /**
   * 일정 삭제 (관리자만 가능)
   */
  async remove(id: number, userUuid: string, userRole: UserRole): Promise<void> {
    // 권한 확인
    if (userRole !== UserRole.ADMIN) {
      throw new ForbiddenException("관리자만 일정을 삭제할 수 있습니다.");
    }

    // 일정 조회
    const schedule = await this.scheduleRepository.findOne({
      where: { id },
    });

    if (!schedule) {
      throw new NotFoundException(`일정을 찾을 수 없습니다. (ID: ${id})`);
    }

    // Soft delete
    await this.scheduleRepository.softDelete(id);
  }
}
