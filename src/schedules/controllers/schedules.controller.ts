// src/schedules/controllers/schedules.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from "@nestjs/swagger";
import { SchedulesService } from "../services/schedules.service";
import { CreateScheduleDto } from "../dto/create-schedule.dto";
import { UpdateScheduleDto } from "../dto/update-schedule.dto";
import { GetSchedulesDto } from "../dto/get-schedules.dto";
import { ScheduleResponseDto, SchedulesResponseDto } from "../dto/schedule-response.dto";
import { InstooApiResponse } from "@/common/dto/instoo-api-response.dto";
import {
  ApiInstooResponses,
  ApiInstooSimpleResponses,
  ApiInstooArrayResponse,
} from "@/common/decorators/api-response.decorator";
import { AuthenticatedRequest, JwtAuthGuard } from "@/auth/guard/jwt-auth.guard";
import { RolesGuard } from "@/auth/guard/role.guard";
import { Roles } from "@/auth/decorators/roles.decorator";
import { UserRole } from "@/common/constants/user-role.enum";
import { ScheduleErrorCode, AuthErrorCode } from "@/common/constants/api-error.enum";

@ApiTags("Schedules")
@Controller()
export class SchedulesController {
  constructor(private readonly schedulesService: SchedulesService) {}

  /**
   * 일정 등록
   */
  @Post("v1/schedules")
  @ApiOperation({
    summary: "일정 등록",
    description: "새로운 일정을 등록합니다. 검증된 방송인만 일정을 등록할 수 있습니다.",
  })
  @ApiInstooResponses(ScheduleResponseDto, {
    success: {
      status: 201,
      description: "일정 등록 성공",
    },
    errors: [
      {
        status: 400,
        code: ScheduleErrorCode.SCHEDULE_STREAMER_NOT_VERIFIED,
        description: "검증이 완료된 스트리머가 아닙니다.",
      },
      {
        status: 400,
        code: ScheduleErrorCode.SCHEDULE_PAST_DATE_NOT_ALLOWED,
        description: "과거 날짜에는 일정을 생성할 수 없습니다.",
      },
      {
        status: 400,
        code: ScheduleErrorCode.SCHEDULE_DATE_TIME_MISMATCH,
        description: "방송일과 방송시간의 일자가 다릅니다.",
      },
      {
        status: 401,
        code: ScheduleErrorCode.SCHEDULE_USER_NOT_FOUND,
        description: "사용자를 찾을 수 없습니다.",
      },
      {
        status: 404,
        code: ScheduleErrorCode.SCHEDULE_STREAMER_NOT_FOUND,
        description: "스트리머를 찾을 수 없습니다.",
      },
      {
        status: 409,
        code: ScheduleErrorCode.SCHEDULE_ALREADY_EXISTS,
        description: "해당 날짜에 이미 일정이 존재합니다.",
      },
      {
        status: 500,
        code: ScheduleErrorCode.SCHEDULE_SAVE_FAILED,
        description: "일정 저장 후 조회에 실패했습니다.",
      },
    ],
  })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async create(
    @Body() createScheduleDto: CreateScheduleDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<InstooApiResponse<ScheduleResponseDto>> {
    const schedule = await this.schedulesService.create(createScheduleDto, req.user!.sub);
    return InstooApiResponse.success(schedule);
  }

  /**
   * 일정 목록 조회
   */
  @Post("v1/schedules/list/streamers")
  @ApiOperation({
    summary: "일정 목록 조회",
    description: "커서 기반 무한 스크롤링을 지원하는 일정 목록을 조회합니다.",
  })
  @ApiInstooArrayResponse(SchedulesResponseDto, {
    status: 200,
    description: "일정 목록 조회 성공",
  })
  async findAllByStreamerUuids(
    @Body() body: GetSchedulesDto,
  ): Promise<InstooApiResponse<SchedulesResponseDto[]>> {
    const result = await this.schedulesService.findAllByStreamerUuids(body);
    return InstooApiResponse.success(result);
  }

  /**
   * 일정 상세 조회
   */
  @Get("v1/schedules/:uuid")
  @ApiOperation({
    summary: "일정 상세 조회",
    description: "UUID로 특정 일정의 상세 정보를 조회합니다.",
  })
  @ApiParam({ name: "uuid", description: "일정 UUID" })
  @ApiInstooResponses(ScheduleResponseDto, {
    success: {
      status: 200,
      description: "일정 조회 성공",
    },
    errors: [
      {
        status: 404,
        code: ScheduleErrorCode.SCHEDULE_NOT_FOUND,
        description: "일정을 찾을 수 없습니다.",
      },
    ],
  })
  async findOne(@Param("uuid") uuid: string): Promise<InstooApiResponse<ScheduleResponseDto>> {
    const schedule = await this.schedulesService.findByUuid(uuid);
    return InstooApiResponse.success(schedule);
  }

  /**
   * 일정 정보 수정
   */
  @Patch("v1/schedules/:uuid")
  @ApiOperation({
    summary: "일정 정보 수정",
    description:
      "일정 정보를 수정합니다. 로그인한 사용자 누구나 수정할 수 있습니다. 충돌 방지를 위해 기존 일정의 updatedAt 값을 lastUpdatedAt으로 전송해야 합니다.",
  })
  @ApiParam({ name: "uuid", description: "일정 UUID" })
  @ApiInstooResponses(ScheduleResponseDto, {
    success: {
      status: 200,
      description: "일정 수정 성공",
    },
    errors: [
      {
        status: 400,
        code: ScheduleErrorCode.SCHEDULE_TIME_ONLY_FOR_SCHEDULED,
        description: "확정된 일정(SCHEDULED)에서만 시작 시간을 설정할 수 있습니다.",
      },
      {
        status: 400,
        code: ScheduleErrorCode.SCHEDULE_SCHEDULED_NEEDS_TIME,
        description: "확정된 일정(SCHEDULED)에는 시작 시간이 필요합니다.",
      },
      {
        status: 400,
        code: ScheduleErrorCode.SCHEDULE_PAST_DATE_NOT_ALLOWED,
        description: "과거 날짜에는 일정을 설정할 수 없습니다.",
      },
      {
        status: 400,
        code: ScheduleErrorCode.SCHEDULE_DATE_TIME_MISMATCH,
        description: "방송일과 방송시간의 일자가 다릅니다.",
      },
      {
        status: 401,
        code: ScheduleErrorCode.SCHEDULE_USER_NOT_FOUND,
        description: "사용자를 찾을 수 없습니다.",
      },
      {
        status: 404,
        code: ScheduleErrorCode.SCHEDULE_NOT_FOUND,
        description: "일정을 찾을 수 없습니다.",
      },
      {
        status: 409,
        code: ScheduleErrorCode.SCHEDULE_CONFLICT_MODIFIED,
        description: "다른 사용자가 이미 수정한 일정입니다.",
      },
      {
        status: 500,
        code: ScheduleErrorCode.SCHEDULE_UPDATE_FAILED,
        description: "일정 업데이트 후 조회에 실패했습니다.",
      },
    ],
  })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async update(
    @Param("uuid") uuid: string,
    @Body() updateScheduleDto: UpdateScheduleDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<InstooApiResponse<ScheduleResponseDto>> {
    const schedule = await this.schedulesService.update(uuid, updateScheduleDto, req.user!.sub);
    return InstooApiResponse.success(schedule);
  }

  /**
   * [관리자] 일정 삭제
   */
  @Delete("v1/schedules/:uuid")
  @ApiOperation({
    summary: "[관리자] 일정 삭제",
    description: "일정을 삭제합니다. 관리자만 삭제할 수 있습니다.",
  })
  @ApiParam({ name: "uuid", description: "일정 UUID" })
  @ApiInstooSimpleResponses({
    success: {
      status: 204,
      description: "일정 삭제 성공",
    },
    errors: [
      {
        status: 401,
        code: AuthErrorCode.AUTH_UNAUTHORIZED,
        description: "인증이 필요합니다.",
      },
      {
        status: 403,
        code: ScheduleErrorCode.SCHEDULE_DELETE_ADMIN_ONLY,
        description: "관리자만 일정을 삭제할 수 있습니다.",
      },
      {
        status: 404,
        code: ScheduleErrorCode.SCHEDULE_NOT_FOUND,
        description: "일정을 찾을 수 없습니다.",
      },
    ],
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param("uuid") uuid: string, @Req() req: AuthenticatedRequest): Promise<void> {
    await this.schedulesService.remove(uuid, req.user!.sub, req.user!.role);
  }
}
