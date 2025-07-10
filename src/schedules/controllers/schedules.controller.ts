// src/schedules/controllers/schedules.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  Req,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from "@nestjs/swagger";
import { SchedulesService } from "../services/schedules.service";
import { CreateScheduleDto } from "../dto/create-schedule.dto";
import { UpdateScheduleDto } from "../dto/update-schedule.dto";
import { QuerySchedulesDto } from "../dto/query-schedules.dto";
import { ScheduleResponseDto, PagedScheduleResponseDto } from "../dto/schedule-response.dto";
import { InstooApiResponse } from "@/common/dto/instoo-api-response.dto";
import {
  ApiInstooResponse,
  ApiInstooErrorResponse,
  ApiInstooResponses,
  ApiInstooSimpleResponses,
} from "@/common/decorators/api-response.decorator";
import { AuthenticatedRequest, JwtAuthGuard } from "@/auth/guard/jwt-auth.guard";
import { RolesGuard } from "@/auth/guard/role.guard";
import { Roles } from "@/auth/decorators/roles.decorator";
import { UserRole } from "@/common/constants/user-role.enum";

@ApiTags("Schedules")
@Controller()
export class SchedulesController {
  constructor(private readonly schedulesService: SchedulesService) {}

  /**
   *
   */
  @Post("v1/schedules")
  @ApiOperation({
    summary: "일정 등록",
    description: "새로운 일정을 등록합니다. 검증된 방송인만 일정을 등록할 수 있습니다.",
  })
  @ApiInstooResponse(ScheduleResponseDto, {
    status: 201,
    description: "일정 등록 성공",
  })
  @ApiInstooErrorResponse(400, "잘못된 요청", {
    code: "BAD_REQUEST",
    message: "요청 데이터가 올바르지 않습니다.",
  })
  @ApiInstooErrorResponse(401, "인증 실패", {
    code: "UNAUTHORIZED",
    message: "인증이 필요합니다.",
  })
  @ApiInstooErrorResponse(404, "방송인을 찾을 수 없음", {
    code: "STREAMER_NOT_FOUND",
    message: "해당 방송인을 찾을 수 없습니다.",
  })
  @ApiInstooErrorResponse(409, "중복된 일정", {
    code: "SCHEDULE_ALREADY_EXISTS",
    message: "해당 날짜에 이미 일정이 존재합니다.",
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
   *
   */
  @Get()
  @ApiOperation({
    summary: "일정 목록 조회",
    description: "커서 기반 무한 스크롤링을 지원하는 일정 목록을 조회합니다.",
  })
  @ApiInstooResponse(PagedScheduleResponseDto, {
    status: 200,
    description: "일정 목록 조회 성공",
  })
  async findAll(
    @Query() query: QuerySchedulesDto,
  ): Promise<InstooApiResponse<PagedScheduleResponseDto>> {
    const result = await this.schedulesService.findAll(query);
    return InstooApiResponse.success(result, "일정 목록을 성공적으로 조회했습니다.");
  }

  /**
   *
   */
  @Get(":id")
  @ApiOperation({
    summary: "일정 상세 조회",
    description: "ID로 특정 일정의 상세 정보를 조회합니다.",
  })
  @ApiParam({ name: "id", description: "일정 ID" })
  @ApiInstooResponses(ScheduleResponseDto, {
    success: {
      status: 200,
      description: "일정 조회 성공",
    },
    errors: [
      {
        status: 404,
        description: "일정을 찾을 수 없음",
        code: "SCHEDULE_NOT_FOUND",
        message: "해당 일정을 찾을 수 없습니다.",
      },
    ],
  })
  async findOne(
    @Param("id", ParseIntPipe) id: number,
  ): Promise<InstooApiResponse<ScheduleResponseDto>> {
    const schedule = await this.schedulesService.findOne(id);
    return InstooApiResponse.success(schedule, "일정 정보를 성공적으로 조회했습니다.");
  }

  /**
   *
   */
  @Patch(":id")
  @ApiOperation({
    summary: "일정 정보 수정",
    description:
      "일정 정보를 수정합니다. 로그인한 사용자 누구나 수정할 수 있습니다. 충돌 방지를 위해 기존 일정의 updatedAt 값을 lastUpdatedAt으로 전송해야 합니다.",
  })
  @ApiParam({ name: "id", description: "일정 ID" })
  @ApiInstooResponses(ScheduleResponseDto, {
    success: {
      status: 200,
      description: "일정 수정 성공",
    },
    errors: [
      {
        status: 400,
        description: "잘못된 요청",
        code: "BAD_REQUEST",
        message: "요청 데이터가 올바르지 않습니다.",
      },
      {
        status: 401,
        description: "인증 실패",
        code: "UNAUTHORIZED",
        message: "인증이 필요합니다.",
      },
      {
        status: 403,
        description: "권한 없음",
        code: "FORBIDDEN",
        message: "과거 일정은 관리자만 수정할 수 있습니다.",
      },
      {
        status: 404,
        description: "일정을 찾을 수 없음",
        code: "SCHEDULE_NOT_FOUND",
        message: "해당 일정을 찾을 수 없습니다.",
      },
      {
        status: 409,
        description: "충돌 발생",
        code: "CONFLICT",
        message: "일정이 다른 사용자에 의해 수정되었습니다.",
      },
    ],
  })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async update(
    @Param("id", ParseIntPipe) id: number,
    @Body() updateScheduleDto: UpdateScheduleDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<InstooApiResponse<ScheduleResponseDto>> {
    const schedule = await this.schedulesService.update(
      id,
      updateScheduleDto,
      req.user!.sub,
      req.user!.role,
    );
    return InstooApiResponse.success(schedule, "일정 정보를 성공적으로 수정했습니다.");
  }

  /**
   *
   */
  @Delete(":id")
  @ApiOperation({
    summary: "일정 삭제",
    description: "일정을 삭제합니다. 관리자만 삭제할 수 있습니다.",
  })
  @ApiParam({ name: "id", description: "일정 ID" })
  @ApiInstooSimpleResponses({
    success: {
      status: 204,
      description: "일정 삭제 성공",
    },
    errors: [
      {
        status: 401,
        description: "인증 실패",
        code: "UNAUTHORIZED",
        message: "인증이 필요합니다.",
      },
      {
        status: 403,
        description: "권한 없음",
        code: "FORBIDDEN",
        message: "관리자만 일정을 삭제할 수 있습니다.",
      },
      {
        status: 404,
        description: "일정을 찾을 수 없음",
        code: "SCHEDULE_NOT_FOUND",
        message: "해당 일정을 찾을 수 없습니다.",
      },
    ],
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param("id", ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
  ): Promise<void> {
    await this.schedulesService.remove(id, req.user!.sub, req.user!.role);
  }

  /**
   *
   */
  @Get("uuid/:uuid")
  @ApiOperation({
    summary: "❌ 일정 UUID로 조회",
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
        description: "일정을 찾을 수 없음",
        code: "SCHEDULE_NOT_FOUND",
        message: "해당 일정을 찾을 수 없습니다.",
      },
    ],
  })
  async findByUuid(@Param("uuid") uuid: string): Promise<InstooApiResponse<ScheduleResponseDto>> {
    const schedule = await this.schedulesService.findByUuid(uuid);
    return InstooApiResponse.success(schedule, "일정 정보를 성공적으로 조회했습니다.");
  }
}
