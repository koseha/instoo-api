// src/schedules/services/schedules.service.ts
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, In, Repository } from "typeorm";
import { Streamer } from "@/streamers/entities/streamer.entity";
import { User } from "@/users/entities/user.entity";
import { CreateScheduleDto } from "../dto/create-schedule.dto";
import { GetSchedulesDto } from "../dto/get-schedules.dto";
import {
  ScheduleBaseInfoDto,
  ScheduleResponseDto,
  SchedulesResponseDto,
} from "../dto/schedule-response.dto";
import { UserRole } from "@/common/constants/user-role.enum";
import { TimeUtils } from "@/common/utils/time.utils";
import { ScheduleStatus } from "@/common/constants/schedule-status.enum";
import { Schedule } from "../entities/schedule.entity";
import { UpdateScheduleDto } from "../dto/update-schedule.dto";
import { ScheduleHistoryService } from "./schedule-history.service";
import {
  ApiException,
  ApiNotFoundException,
  ApiConflictException,
  ApiForbiddenException,
  ApiInternalServerException,
  ApiUnauthorizedException,
} from "@/common/exceptions/api-exceptions";
import {
  ScheduleErrorCode,
  StreamerErrorCode,
  UserErrorCode,
} from "@/common/constants/api-error.enum";
import { ScheduleLikesService } from "./schedule-likes.service";
import { ScheduleLike } from "../entities/schedule-like.entity";

@Injectable()
export class SchedulesService {
  constructor(
    @InjectRepository(Schedule)
    private readonly scheduleRepository: Repository<Schedule>,
    @InjectRepository(Streamer)
    private readonly streamerRepository: Repository<Streamer>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private dataSource: DataSource,
    private readonly scheduleHistoryService: ScheduleHistoryService,
    @InjectRepository(ScheduleLike)
    private readonly scheduleLikeRepository: Repository<ScheduleLike>,
  ) {}

  /**
   * 일정 등록
   */
  async create(
    createScheduleDto: CreateScheduleDto,
    userUuid: string,
  ): Promise<ScheduleResponseDto> {
    return await this.dataSource.transaction(async (manager) => {
      // 1. 사용자 존재 확인
      const user = await manager.findOne(User, {
        where: { uuid: userUuid },
      });

      if (!user) {
        throw new ApiUnauthorizedException(ScheduleErrorCode.SCHEDULE_USER_NOT_FOUND);
      }

      // 2. 스트리머 존재 확인
      const streamer = await manager.findOne(Streamer, {
        where: { uuid: createScheduleDto.streamerUuid },
      });

      if (!streamer) {
        throw new ApiNotFoundException(ScheduleErrorCode.SCHEDULE_STREAMER_NOT_FOUND);
      }

      if (!streamer.isVerified) {
        throw new ApiException(ScheduleErrorCode.SCHEDULE_STREAMER_NOT_VERIFIED);
      }

      // 3. 날짜 유효성 검사 - 오늘 날짜보다 이전인지 확인 (KST 기준)
      const today = TimeUtils.toKstDateString(new Date()); // 오늘 날짜를 KST 기준 문자열로 변환

      if (createScheduleDto.scheduleDate < today) {
        throw new ApiException(ScheduleErrorCode.SCHEDULE_PAST_DATE_NOT_ALLOWED);
      }

      // 4. 시작 시간 유효성 검사 (SCHEDULED 상태인 경우) - 날짜만 검사
      if (createScheduleDto.startTime && createScheduleDto.status === ScheduleStatus.SCHEDULED) {
        const startTimeDate = new Date(createScheduleDto.startTime);

        // startTime을 KST 기준 날짜 문자열로 변환
        const startTimeDateString = TimeUtils.toKstDateString(startTimeDate);

        // 과거 날짜인지 확인 (날짜 기준)
        if (startTimeDateString < today) {
          throw new ApiException(ScheduleErrorCode.SCHEDULE_PAST_DATE_NOT_ALLOWED);
        }
        if (createScheduleDto.scheduleDate !== startTimeDateString) {
          throw new ApiException(ScheduleErrorCode.SCHEDULE_DATE_TIME_MISMATCH);
        }
      }

      // 5. 같은 날짜에 이미 일정이 있는지 확인 (간단한 문자열 비교)
      const existingSchedule = await manager.findOne(Schedule, {
        where: {
          streamerUuid: createScheduleDto.streamerUuid,
          scheduleDate: createScheduleDto.scheduleDate,
        },
      });

      if (existingSchedule) {
        throw new ApiConflictException(ScheduleErrorCode.SCHEDULE_ALREADY_EXISTS);
      }

      // 6. 시작 시간 처리
      let startTime: Date | null = null;
      if (createScheduleDto.startTime && createScheduleDto.status === ScheduleStatus.SCHEDULED) {
        // ISO 문자열(UTC)을 Date 객체로 변환
        startTime = new Date(createScheduleDto.startTime);
      }

      // 7. Schedule 엔티티 생성
      const schedule = manager.create(Schedule, {
        // uuid는 @Generated("uuid")로 자동 생성됨
        title: createScheduleDto.title,
        scheduleDate: createScheduleDto.scheduleDate, // 문자열 그대로 저장 (KST 기준)
        startTime: startTime, // UTC Date 객체로 저장
        status: createScheduleDto.status, // enum 값 직접 저장
        description: createScheduleDto.description,
        streamerUuid: createScheduleDto.streamerUuid,
        createdBy: userUuid, // BaseVersionEntity의 createdBy 필드
        updatedBy: userUuid, // BaseVersionEntity의 updatedBy 필드
      });

      // 8. 저장
      const savedSchedule = await manager.save(Schedule, schedule);

      // 9. 생성 이력 기록
      await this.scheduleHistoryService.recordCreateWithTransaction(
        savedSchedule,
        userUuid,
        manager,
      );

      // 9. 관계 데이터와 함께 다시 조회
      const scheduleWithRelations = await manager.findOne(Schedule, {
        where: { uuid: savedSchedule.uuid },
        relations: ["streamer", "createdByUser", "updatedByUser"],
      });

      if (!scheduleWithRelations) {
        throw new ApiInternalServerException(ScheduleErrorCode.SCHEDULE_SAVE_FAILED);
      }

      // 10. DTO로 변환하여 반환
      return ScheduleResponseDto.of(scheduleWithRelations);
    });
  }

  /**
   * 일정 목록 조회
   */
  async findAllByStreamerUuids(
    body: GetSchedulesDto,
    userUuid?: string, // Controller에서 JWT 토큰으로부터 추출해서 전달
  ): Promise<SchedulesResponseDto[]> {
    const { startDate, endDate, streamerUuids } = body;

    // 기본값 설정
    const defaultStartDate = startDate || TimeUtils.toKstDateString(new Date());
    const defaultEndDate =
      endDate || TimeUtils.toKstDateString(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));

    // 쿼리 빌더 생성
    const queryBuilder = this.scheduleRepository
      .createQueryBuilder("schedule")
      .leftJoinAndSelect("schedule.streamer", "streamer")
      .leftJoinAndSelect("streamer.platforms", "platforms")
      .where("schedule.scheduleDate >= :startDate", { startDate: defaultStartDate })
      .andWhere("schedule.scheduleDate <= :endDate", { endDate: defaultEndDate });

    // 스트리머 UUID 필터링 (선택적)
    if (streamerUuids && streamerUuids.length > 0) {
      queryBuilder.andWhere("schedule.streamerUuid IN (:...streamerUuids)", { streamerUuids });
    }

    // 정렬: 날짜 순, 시간 순
    queryBuilder.orderBy("schedule.scheduleDate", "ASC").addOrderBy("schedule.startTime", "ASC");

    // 쿼리 실행
    const schedules = await queryBuilder.getMany();

    // 모든 스케줄 UUID 추출
    const scheduleUuids = schedules.map((schedule) => schedule.uuid);

    // 현재 유저가 좋아요한 스케줄들을 한번에 조회
    const likedScheduleUuids = new Set<string>();
    if (userUuid && scheduleUuids.length > 0) {
      const likedSchedules = await this.scheduleLikeRepository.find({
        where: {
          userUuid,
          scheduleUuid: In(scheduleUuids),
        },
        select: ["scheduleUuid"],
      });

      likedSchedules.forEach((like) => {
        likedScheduleUuids.add(like.scheduleUuid);
      });
    }

    // 날짜별로 그룹핑
    const schedulesByDate = new Map<string, Schedule[]>();

    schedules.forEach((schedule) => {
      // scheduleDate는 이미 "YYYY-MM-DD" 형식의 문자열이므로 그대로 사용
      const dateKey = schedule.scheduleDate;
      const scheduleList = schedulesByDate.get(dateKey) || [];
      scheduleList.push(schedule);
      schedulesByDate.set(dateKey, scheduleList);
    });

    // 응답 DTO 변환
    const result: SchedulesResponseDto[] = [];

    // 날짜 범위 내의 모든 날짜 생성 (데이터가 없는 날짜도 포함)
    const currentDate = TimeUtils.parseKstDate(defaultStartDate);
    const endDateTime = TimeUtils.parseKstDate(defaultEndDate);

    while (currentDate <= endDateTime) {
      const dateString = TimeUtils.toKstDateString(currentDate);
      const daySchedules = schedulesByDate.get(dateString) || [];

      // 타입별로 분류 (ScheduleStatus enum 기준)
      const breaks: ScheduleBaseInfoDto[] = [];
      const tbd: ScheduleBaseInfoDto[] = [];
      const scheduled: ScheduleBaseInfoDto[] = [];

      daySchedules.forEach((schedule) => {
        const scheduleDto: ScheduleBaseInfoDto = {
          uuid: schedule.uuid,
          startTime: this.formatStartTime(schedule),
          title: schedule.title,
          streamerName: schedule.streamer.name,
          likeCount: schedule.likeCount ?? 0,
          isLiked: likedScheduleUuids.has(schedule.uuid), // 좋아요 여부 확인
        };

        // ScheduleStatus enum 기준으로 분류
        switch (schedule.status) {
          case ScheduleStatus.BREAK:
            breaks.push(scheduleDto);
            break;
          case ScheduleStatus.TIME_TBD:
            tbd.push(scheduleDto);
            break;
          case ScheduleStatus.SCHEDULED:
            scheduled.push(scheduleDto);
            break;
          default:
            // 기본적으로 scheduled로 처리
            scheduled.push(scheduleDto);
            break;
        }
      });

      result.push({
        scheduleDate: dateString,
        breaks,
        tbd,
        scheduled,
      });

      // 다음 날로 이동
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return result;
  }

  /**
   * 시작 시간을 KST HH:mm 형식으로 포맷팅
   */
  private formatStartTime(schedule: Schedule): string | null {
    if (!schedule.startTime) {
      return null;
    }

    return TimeUtils.toKstTimeOnly(schedule.startTime);
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
      throw new ApiNotFoundException(ScheduleErrorCode.SCHEDULE_NOT_FOUND);
    }

    return ScheduleResponseDto.of(schedule);
  }

  /**
   * 일정 수정 (충돌 방지 포함)
   */
  async update(
    uuid: string,
    updateScheduleDto: UpdateScheduleDto,
    userUuid: string,
  ): Promise<ScheduleResponseDto> {
    return await this.dataSource.transaction(async (manager) => {
      // 1. 기존 일정 조회
      const existingSchedule = await manager.findOne(Schedule, {
        where: { uuid },
        relations: ["streamer", "createdByUser", "updatedByUser"],
      });

      if (!existingSchedule) {
        throw new ApiNotFoundException(ScheduleErrorCode.SCHEDULE_NOT_FOUND);
      }
      const previousSchedule = Object.assign(new Schedule(), existingSchedule);

      // 2. 사용자 존재 확인
      const user = await manager.findOne(User, {
        where: { uuid: userUuid },
      });

      if (!user) {
        throw new ApiUnauthorizedException(ScheduleErrorCode.SCHEDULE_USER_NOT_FOUND);
      }

      // 3. 충돌 방지 - 마지막 수정 시간 확인
      const lastUpdatedAt = new Date(updateScheduleDto.lastUpdatedAt);
      const existingUpdatedAt = new Date(existingSchedule.updatedAt);

      if (lastUpdatedAt.getTime() !== existingUpdatedAt.getTime()) {
        throw new ApiConflictException(ScheduleErrorCode.SCHEDULE_CONFLICT_MODIFIED);
      }

      // 5. 업데이트할 필드들 준비
      const updateData: Partial<Schedule> = {
        updatedBy: userUuid,
      };

      // 제목 업데이트
      if (updateScheduleDto.title !== undefined) {
        updateData.title = updateScheduleDto.title;
      }

      // 상태 업데이트
      if (updateScheduleDto.status !== undefined) {
        updateData.status = updateScheduleDto.status;
      }

      // 설명 업데이트
      if (updateScheduleDto.description !== undefined) {
        updateData.description = updateScheduleDto.description;
      }

      // 6. 시작 시간 처리
      if (updateScheduleDto.startTime !== undefined) {
        // startTime이 제공된 경우
        if (updateScheduleDto.startTime) {
          // 상태가 SCHEDULED인 경우에만 시작 시간 설정 가능
          const finalStatus = updateScheduleDto.status ?? existingSchedule.status;
          if (finalStatus !== ScheduleStatus.SCHEDULED) {
            throw new ApiException(ScheduleErrorCode.SCHEDULE_TIME_ONLY_FOR_SCHEDULED);
          }

          const startTimeDate = new Date(updateScheduleDto.startTime);
          const startTimeDateString = TimeUtils.toKstDateString(startTimeDate);
          const today = TimeUtils.toKstDateString(new Date());

          // 과거 시간 확인
          if (startTimeDateString < today) {
            throw new ApiException(ScheduleErrorCode.SCHEDULE_PAST_DATE_NOT_ALLOWED);
          }
          if (startTimeDateString !== existingSchedule.scheduleDate) {
            throw new ApiException(ScheduleErrorCode.SCHEDULE_DATE_TIME_MISMATCH);
          }

          updateData.startTime = startTimeDate;
        } else {
          // startTime이 null/undefined로 제공된 경우 - 시간 삭제
          updateData.startTime = null;
        }
      } else {
        // startTime이 dto에 없는 경우, 상태 변경에 따른 처리
        if (updateScheduleDto.status !== undefined) {
          const finalStatus = updateScheduleDto.status;

          // SCHEDULED가 아닌 상태로 변경하는 경우 시작 시간 제거
          if (finalStatus !== ScheduleStatus.SCHEDULED && existingSchedule.startTime) {
            updateData.startTime = null;
          }

          // SCHEDULED로 변경하는 경우 시작 시간이 없으면 에러
          if (finalStatus === ScheduleStatus.SCHEDULED && !existingSchedule.startTime) {
            throw new ApiException(ScheduleErrorCode.SCHEDULE_SCHEDULED_NEEDS_TIME);
          }
        }
      }

      // 7. 상태와 시작 시간 일관성 검사
      const finalStatus = updateScheduleDto.status ?? existingSchedule.status;
      const finalStartTime =
        updateData.startTime !== undefined ? updateData.startTime : existingSchedule.startTime;

      if (finalStatus === ScheduleStatus.SCHEDULED && !finalStartTime) {
        throw new ApiException(ScheduleErrorCode.SCHEDULE_SCHEDULED_NEEDS_TIME);
      }

      if (finalStatus !== ScheduleStatus.SCHEDULED && finalStartTime) {
        // 이미 위에서 처리했지만 안전을 위해 다시 한 번 확인
        updateData.startTime = null;
      }

      // 8. 업데이트 실행
      await manager.update(Schedule, { uuid }, updateData);

      // 9. 업데이트된 일정 조회
      const updatedSchedule = await manager.findOne(Schedule, {
        where: { uuid },
        relations: ["streamer", "createdByUser", "updatedByUser"],
      });

      if (!updatedSchedule) {
        throw new ApiInternalServerException(ScheduleErrorCode.SCHEDULE_UPDATE_FAILED);
      }

      // 수정 이력 기록
      await this.scheduleHistoryService.recordUpdateWithTransaction(
        manager,
        updatedSchedule,
        previousSchedule,
        userUuid,
      );

      return ScheduleResponseDto.of(updatedSchedule);
    });
  }

  /**
   * 일정 삭제 (관리자만 가능)
   */
  async remove(uuid: string, userUuid: string, userRole: UserRole): Promise<void> {
    // 권한 확인
    if (userRole !== UserRole.ADMIN) {
      throw new ApiForbiddenException(ScheduleErrorCode.SCHEDULE_DELETE_ADMIN_ONLY);
    }

    // 일정 조회
    const schedule = await this.scheduleRepository.findOne({
      where: { uuid },
    });

    if (!schedule) {
      throw new ApiNotFoundException(ScheduleErrorCode.SCHEDULE_NOT_FOUND);
    }

    // Soft delete
    await this.scheduleRepository.softDelete(uuid);
  }
}
