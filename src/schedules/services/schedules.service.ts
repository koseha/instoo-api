// src/schedules/services/schedules.service.ts
import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
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
    // 사용자 조회
    const user = await this.userRepository.findOne({
      where: { uuid: userUuid, isActive: true },
    });
    if (!user) {
      throw new NotFoundException("사용자를 찾을 수 없습니다.");
    }

    // 방송인 조회 및 검증 상태 확인
    const streamer = await this.streamerRepository.findOne({
      where: { uuid: createScheduleDto.streamerUuid, isActive: true },
    });
    if (!streamer) {
      throw new NotFoundException("방송인을 찾을 수 없습니다.");
    }
    if (!streamer.isVerified) {
      throw new BadRequestException("검증되지 않은 방송인은 일정을 등록할 수 없습니다.");
    }

    // 같은 날짜에 이미 일정이 있는지 확인
    const existingSchedule = await this.scheduleRepository.findOne({
      where: {
        streamerUuid: createScheduleDto.streamerUuid,
        scheduleDate: new Date(createScheduleDto.scheduleDate),
      },
    });
    if (existingSchedule) {
      throw new ConflictException(
        `${createScheduleDto.scheduleDate} 날짜에 이미 "${streamer.name}"의 일정이 존재합니다.`,
      );
    }

    // 과거 날짜 등록 방지
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const scheduleDate = new Date(createScheduleDto.scheduleDate);
    if (scheduleDate < today) {
      throw new BadRequestException("과거 날짜의 일정은 등록할 수 없습니다.");
    }

    // 일정 데이터 생성
    const scheduleData = {
      title: createScheduleDto.title,
      scheduleDate: new Date(createScheduleDto.scheduleDate),
      isTimeUndecided: createScheduleDto.isTimeUndecided || false,
      isBreak: createScheduleDto.isBreak || false,
      description: createScheduleDto.description,
      streamerUuid: createScheduleDto.streamerUuid,
      createdBy: user.id,
      updatedBy: user.id,
      startTime: undefined as Date | undefined,
    };

    // startTime 처리
    if (!scheduleData.isBreak && !scheduleData.isTimeUndecided && createScheduleDto.startTime) {
      scheduleData.startTime = new Date(createScheduleDto.startTime);
    }

    const schedule = this.scheduleRepository.create(scheduleData);
    const savedSchedule = await this.scheduleRepository.save(schedule);

    return this.findOne(savedSchedule.id);
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
