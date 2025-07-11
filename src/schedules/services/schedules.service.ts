// src/schedules/services/schedules.service.ts
import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  InternalServerErrorException,
  UnauthorizedException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";
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
        throw new UnauthorizedException("사용자를 찾을 수 없습니다.");
      }

      // 2. 스트리머 존재 확인
      const streamer = await manager.findOne(Streamer, {
        where: { uuid: createScheduleDto.streamerUuid },
      });

      if (!streamer) {
        throw new NotFoundException("스트리머를 찾을 수 없습니다.");
      }
      if (!streamer.isVerified) throw new BadRequestException("검증이 완료된 스트리머가 아닙니다.");

      // 3. 날짜 유효성 검사 - 오늘 날짜보다 이전인지 확인 (KST 기준)
      const today = TimeUtils.toKstDateString(new Date()); // 오늘 날짜를 KST 기준 문자열로 변환

      if (createScheduleDto.scheduleDate < today) {
        throw new BadRequestException("과거 날짜에는 일정을 생성할 수 없습니다.");
      }

      // 4. 시작 시간 유효성 검사 (SCHEDULED 상태인 경우)
      if (createScheduleDto.startTime && createScheduleDto.status === ScheduleStatus.SCHEDULED) {
        const startTimeDate = new Date(createScheduleDto.startTime);

        // startTime을 KST 기준 날짜 문자열로 변환
        const startTimeDateString = TimeUtils.toKstDateString(startTimeDate);

        // 과거 날짜인지 확인 (날짜 기준)
        if (startTimeDateString < today) {
          throw new BadRequestException("과거 날짜에는 일정을 생성할 수 없습니다.");
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
        throw new ConflictException("해당 날짜에 이미 일정이 존재합니다.");
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
        createdByUserUuid: userUuid, // BaseVersionEntity의 createdBy 필드
        updatedByUserUuid: userUuid, // BaseVersionEntity의 updatedBy 필드
      });

      // 8. 저장
      const savedSchedule = await manager.save(Schedule, schedule);

      // 9. 관계 데이터와 함께 다시 조회
      const scheduleWithRelations = await manager.findOne(Schedule, {
        where: { id: savedSchedule.id },
        relations: ["streamer", "createdByUser", "updatedByUser"],
      });

      if (!scheduleWithRelations) {
        throw new InternalServerErrorException("일정 저장 후 조회에 실패했습니다.");
      }

      // 10. DTO로 변환하여 반환
      return ScheduleResponseDto.of(scheduleWithRelations);
    });
  }

  /**
   * 일정 목록 조회
   */
  async findAllByStreamerUuids(body: GetSchedulesDto): Promise<SchedulesResponseDto[]> {
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
    queryBuilder
      .orderBy("schedule.scheduleDate", "ASC")
      .addOrderBy("schedule.startTime", "ASC")
      .addOrderBy("schedule.id", "ASC");

    // 쿼리 실행
    const schedules = await queryBuilder.getMany();

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
          streamerPlatforms: schedule.streamer.platforms.map((p) => p.platformName) || [],
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
  // async update(
  //   uuid: string,
  //   updateScheduleDto: UpdateScheduleDto,
  //   userUuid: string,
  //   userRole: UserRole,
  // ): Promise<ScheduleResponseDto> {
  //   return await this.dataSource.transaction(async (manager) => {
  //     // 1. 사용자 조회
  //     const user = await manager.findOne(User, {
  //       where: { uuid: userUuid, isActive: true },
  //     });

  //     if (!user) {
  //       throw new NotFoundException("사용자를 찾을 수 없습니다.");
  //     }

  //     // 2. 기존 일정 조회 (관계 데이터 포함)
  //     const schedule = await manager.findOne(Schedule, {
  //       where: { uuid },
  //       relations: ["streamer", "createdByUser", "updatedByUser"],
  //     });

  //     if (!schedule) {
  //       throw new NotFoundException(`일정을 찾을 수 없습니다. (UUID: ${uuid})`);
  //     }

  //     // 3. 과거 일정 수정 권한 확인 (관리자만 가능)
  //     const today = new Date();
  //     const todayKst = TimeUtils.toKst(today).split("T")[0];
  //     const scheduleDateKst = TimeUtils.toKst(schedule.scheduleDate).split("T")[0];

  //     if (scheduleDateKst < todayKst && userRole !== UserRole.ADMIN) {
  //       throw new ForbiddenException("과거 일정은 관리자만 수정할 수 있습니다.");
  //     }

  //     // 4. 충돌 방지: lastUpdatedAt 체크
  //     const requestLastUpdatedAt = new Date(updateScheduleDto.lastUpdatedAt);
  //     const currentLastUpdatedAt = schedule.updatedAt;

  //     if (requestLastUpdatedAt.getTime() !== currentLastUpdatedAt.getTime()) {
  //       throw new ConflictException(
  //         "일정이 다른 사용자에 의해 수정되었습니다. 최신 정보를 다시 불러온 후 수정해주세요.",
  //       );
  //     }

  //     // 5. 수정할 데이터 준비
  //     const updateData: Partial<Schedule> = {
  //       updatedByUser: user,
  //       version: schedule.version + 1,
  //     };

  //     // 기본 필드 업데이트
  //     if (updateScheduleDto.title !== undefined) {
  //       updateData.title = updateScheduleDto.title;
  //     }

  //     if (updateScheduleDto.description !== undefined) {
  //       updateData.description = updateScheduleDto.description;
  //     }

  //     if (updateScheduleDto.isBreak !== undefined) {
  //       updateData.isBreak = updateScheduleDto.isBreak;
  //     }

  //     if (updateScheduleDto.isTimeUndecided !== undefined) {
  //       updateData.isTimeUndecided = updateScheduleDto.isTimeUndecided;
  //     }

  //     // 6. 날짜 변환 및 시작 시간 처리
  //     let startTime: Date | undefined = schedule.startTime || undefined;

  //     // 시작 시간 처리
  //     if (updateScheduleDto.startTime !== undefined) {
  //       if (updateScheduleDto.startTime && !updateData.isTimeUndecided && !updateData.isBreak) {
  //         startTime = new Date(updateScheduleDto.startTime);
  //         updateData.startTime = startTime;
  //       } else {
  //         startTime = undefined;
  //         updateData.startTime = null;
  //       }
  //     } else {
  //       // 시작 시간이 변경되지 않았지만 isBreak 또는 isTimeUndecided가 변경된 경우
  //       if (updateData.isBreak || updateData.isTimeUndecided) {
  //         startTime = undefined;
  //         updateData.startTime = null;
  //       }
  //     }

  //     // 7. 비즈니스 로직 검증 (변경된 내용에 대해서만)
  //     const finalIsBreak = updateData.isBreak !== undefined ? updateData.isBreak : schedule.isBreak;
  //     const finalIsTimeUndecided =
  //       updateData.isTimeUndecided !== undefined
  //         ? updateData.isTimeUndecided
  //         : schedule.isTimeUndecided;

  //     await this.validateScheduleUpdate(
  //       schedule.id,
  //       schedule.streamer.id,
  //       startTime,
  //       finalIsTimeUndecided,
  //       finalIsBreak,
  //     );

  //     // 8. 일정 수정 실행
  //     Object.assign(schedule, updateData);
  //     const savedSchedule = await manager.save(schedule);

  //     // 9. 저장된 일정 조회 (관계 데이터 포함)
  //     const result = await manager.findOne(Schedule, {
  //       where: { id: savedSchedule.id },
  //       relations: ["streamer", "createdByUser", "updatedByUser"],
  //     });

  //     if (!result) {
  //       throw new InternalServerErrorException("일정 수정 중 오류가 발생했습니다.");
  //     }

  //     // 10. DTO 변환 후 반환
  //     return ScheduleResponseDto.of(result);
  //   });
  // }

  // /**
  //  * 일정 수정 시 비즈니스 로직 검증
  //  */
  // private async validateScheduleUpdate(
  //   scheduleId: number,
  //   streamerId: number,
  //   scheduleDate: Date,
  //   startTime: Date | undefined,
  //   isTimeUndecided: boolean,
  //   isBreak: boolean,
  // ): Promise<void> {
  //   const today = new Date();
  //   const todayKst = TimeUtils.toKst(today).split("T")[0];
  //   const scheduleDateKst = TimeUtils.toKst(scheduleDate).split("T")[0];

  //   if (scheduleDateKst < todayKst) {
  //     throw new BadRequestException("방송일은 오늘 이후여야 합니다.");
  //   }

  //   // 해당 방송일의 기존 일정들 조회 (수정 중인 일정은 제외)
  //   const existingSchedules = await this.scheduleRepository.find({
  //     where: {
  //       streamer: { id: streamerId },
  //       scheduleDate: scheduleDate,
  //       id: Not(scheduleId), // 수정 중인 일정은 제외
  //     },
  //     order: { startTime: "ASC" },
  //   });

  //   // 휴방 관련 검증
  //   if (isBreak) {
  //     // 해당 방송일에 다른 일정이 존재하면 휴방 일정 등록 불가
  //     if (existingSchedules.length > 0) {
  //       throw new ConflictException(
  //         "해당 방송일에 이미 다른 일정이 존재하여 휴방 일정으로 수정할 수 없습니다.",
  //       );
  //     }
  //   } else {
  //     // 휴방이 아닌 경우, 해당 방송일에 휴방 일정이 있으면 등록 불가
  //     const hasBreakSchedule = existingSchedules.some((schedule) => schedule.isBreak);
  //     if (hasBreakSchedule) {
  //       throw new ConflictException(
  //         "해당 방송일에 휴방 일정이 존재하여 다른 일정으로 수정할 수 없습니다.",
  //       );
  //     }
  //   }

  //   // 방송일 기준 최대 2개 일정 제한
  //   if (existingSchedules.length >= 2) {
  //     throw new ConflictException("방송일 기준으로 최대 2개의 일정만 등록할 수 있습니다.");
  //   }

  //   // 시간 미정 관련 검증
  //   if (isTimeUndecided) {
  //     const timeUndecidedCount = existingSchedules.filter(
  //       (schedule) => schedule.isTimeUndecided,
  //     ).length;
  //     if (timeUndecidedCount >= 2) {
  //       throw new ConflictException("해당 방송일에 시간 미정 일정은 2개 이상 등록할 수 없습니다.");
  //     }
  //   }

  //   // 시작 시간 중복 검증 (시간이 지정된 경우만)
  //   if (startTime && !isTimeUndecided && !isBreak) {
  //     for (const existingSchedule of existingSchedules) {
  //       if (
  //         existingSchedule.startTime &&
  //         !existingSchedule.isTimeUndecided &&
  //         !existingSchedule.isBreak
  //       ) {
  //         const timeDiff = Math.abs(startTime.getTime() - existingSchedule.startTime.getTime());
  //         const hoursDiff = timeDiff / (1000 * 60 * 60); // 밀리초를 시간으로 변환

  //         // ±2시간 이내에 다른 일정이 있으면 등록 불가
  //         if (hoursDiff < 2) {
  //           throw new ConflictException(
  //             "시작 시간 기준 ±2시간 이내에 다른 일정이 존재하여 수정할 수 없습니다.",
  //           );
  //         }
  //       }
  //     }
  //   }
  // }

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
