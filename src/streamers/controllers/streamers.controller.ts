// src/streamers/controllers/streamers.controller.ts
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
  Req,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from "@nestjs/swagger";
import { StreamersService } from "../services/streamers.service";
import { CreateStreamerDto } from "../dto/create-streamer.dto";
import { UpdateStreamerDto } from "../dto/update-streamer.dto";
import { GetStreamersDto } from "../dto/get-streamers.dto";
import {
  StreamerResponseDto,
  PagedStreamerResponseDto,
  VerifyStreamerDto,
  StreamerSimpleDto,
} from "../dto/streamer-response.dto";
import { InstooApiResponse } from "@/common/dto/instoo-api-response.dto";
import {
  ApiInstooArrayResponse,
  ApiInstooErrorResponse,
  ApiInstooResponse,
  ApiInstooResponses,
  ApiInstooSimpleResponses,
} from "@/common/decorators/api-response.decorator";
import { AuthenticatedRequest, JwtAuthGuard } from "@/auth/guard/jwt-auth.guard";
import { RolesGuard } from "@/auth/guard/role.guard";
import { Roles } from "@/auth/decorators/roles.decorator";
import { UserRole } from "@/common/constants/user-role.enum";
import { StreamerErrorCode, AuthErrorCode, UserErrorCode } from "@/common/constants/api-error.enum";

@ApiTags("Streamers")
@Controller()
export class StreamersController {
  constructor(private readonly streamersService: StreamersService) {}

  /**
   * 방송인 생성
   */
  @Post("v1/streamers")
  @ApiOperation({
    summary: "방송인 생성",
    description: "새로운 방송인을 생성합니다. 인증된 사용자만 생성할 수 있습니다.",
  })
  @ApiInstooResponses(StreamerResponseDto, {
    success: {
      status: 201,
      description: "방송인 생성 성공",
    },
    errors: [
      {
        status: 401,
        code: AuthErrorCode.AUTH_UNAUTHORIZED,
        description: "인증이 필요합니다.",
      },
      {
        status: 404,
        code: UserErrorCode.USER_NOT_FOUND,
        description: "사용자를 찾을 수 없습니다.",
      },
      {
        status: 409,
        code: StreamerErrorCode.STREAMER_ALREADY_EXISTS,
        description: "방송인이 플랫폼에 이미 존재합니다.",
      },
    ],
  })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async create(
    @Body() createStreamerDto: CreateStreamerDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<InstooApiResponse<StreamerResponseDto>> {
    const streamer = await this.streamersService.create(createStreamerDto, req.user!.sub);
    return InstooApiResponse.success(streamer);
  }

  /**
   * 방송인 목록 조회
   */
  @Post("v1/streamers/list")
  @ApiOperation({
    summary: "방송인 목록 조회",
    description: "무한 스크롤링을 지원하는 방송인 목록을 조회합니다.",
  })
  @ApiInstooResponse(PagedStreamerResponseDto, {
    status: 200,
    description: "방송인 목록 조회 성공",
  })
  async findAll(
    @Body() body: GetStreamersDto,
  ): Promise<InstooApiResponse<PagedStreamerResponseDto>> {
    const result = await this.streamersService.findAll(body);
    return InstooApiResponse.success(result);
  }

  /**
   * 방송인 간편 검색
   */
  @Get("v1/streamers/search")
  @ApiOperation({
    summary: "방송인 간편 검색",
    description: "방송인 이름으로 검색하여 해당하는 방송인들의 목록을 조회합니다.",
  })
  @ApiInstooArrayResponse(StreamerSimpleDto, {
    status: 200,
    description: "자동완성 검색 성공",
  })
  @ApiInstooErrorResponse(400, "검색어는 최소 2글자 이상이어야 합니다.", {
    code: StreamerErrorCode.STREAMER_SEARCH_TERM_TOO_SHORT,
  })
  async search(@Query("qName") qName: string): Promise<InstooApiResponse<StreamerSimpleDto[]>> {
    const result = await this.streamersService.searchStreamersByName(qName);
    return InstooApiResponse.success(result);
  }

  /**
   * 방송인 상세 조회
   */
  @Get("v1/streamers/:uuid")
  @ApiOperation({
    summary: "방송인 상세 조회",
    description: "UUID로 특정 방송인의 상세 정보를 조회합니다.",
  })
  @ApiParam({ name: "uuid", description: "방송인 UUID" })
  @ApiInstooResponses(StreamerResponseDto, {
    success: {
      status: 200,
      description: "방송인 조회 성공",
    },
    errors: [
      {
        status: 404,
        code: StreamerErrorCode.STREAMER_NOT_FOUND,
        description: "방송인을 찾을 수 없습니다.",
      },
    ],
  })
  async findOne(@Param("uuid") uuid: string): Promise<InstooApiResponse<StreamerResponseDto>> {
    const streamer = await this.streamersService.findByUuid(uuid);
    return InstooApiResponse.success(streamer);
  }

  /**
   * 방송인 정보 수정
   */
  @Patch("v1/streamers/:uuid")
  @ApiOperation({
    summary: "방송인 정보 수정",
    description:
      "방송인 정보를 수정합니다. 로그인한 사용자 누구나 수정할 수 있습니다. 충돌 방지를 위해 기존 방송인의 updatedAt 값을 lastUpdatedAt으로 전송해야 합니다.",
  })
  @ApiParam({ name: "uuid", description: "방송인 UUID" })
  @ApiInstooResponses(StreamerResponseDto, {
    success: {
      status: 200,
      description: "방송인 수정 성공",
    },
    errors: [
      {
        status: 401,
        code: AuthErrorCode.AUTH_UNAUTHORIZED,
        description: "인증이 필요합니다.",
      },
      {
        status: 404,
        code: UserErrorCode.USER_NOT_FOUND,
        description: "사용자를 찾을 수 없습니다.",
      },
      {
        status: 404,
        code: StreamerErrorCode.STREAMER_NOT_FOUND,
        description: "방송인을 찾을 수 없습니다.",
      },
      {
        status: 409,
        code: StreamerErrorCode.STREAMER_CONFLICT_MODIFIED,
        description: "다른 사용자가 이미 수정한 방송인입니다.",
      },
      {
        status: 409,
        code: StreamerErrorCode.STREAMER_NAME_ALREADY_EXISTS,
        description: "방송인 이름이 이미 존재합니다.",
      },
    ],
  })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async update(
    @Param("uuid") uuid: string,
    @Body() updateStreamerDto: UpdateStreamerDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<InstooApiResponse<StreamerResponseDto>> {
    const streamer = await this.streamersService.update(
      uuid,
      updateStreamerDto,
      req.user!.sub,
      req.user!.role,
    );
    return InstooApiResponse.success(streamer);
  }

  /**
   * [관리자] 방송인 인증 상태 변경
   */
  @Patch("v1/streamers/:uuid/verify")
  @ApiOperation({
    summary: "[관리자] 방송인 인증 상태 변경",
    description: "방송인의 인증 상태를 변경합니다. 관리자만 변경할 수 있습니다.",
  })
  @ApiParam({ name: "uuid", description: "방송인 UUID" })
  @ApiInstooResponses(StreamerResponseDto, {
    success: {
      status: 200,
      description: "방송인 인증 상태 변경 성공",
    },
    errors: [
      {
        status: 401,
        code: AuthErrorCode.AUTH_UNAUTHORIZED,
        description: "인증이 필요합니다.",
      },
      {
        status: 403,
        code: AuthErrorCode.AUTH_UNAUTHORIZED,
        description: "관리자 권한이 필요합니다.",
      },
      {
        status: 404,
        code: StreamerErrorCode.STREAMER_NOT_FOUND,
        description: "방송인을 찾을 수 없습니다.",
      },
    ],
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  async verifyStreamer(
    @Param("uuid") uuid: string,
    @Body() verifyDto: VerifyStreamerDto,
  ): Promise<InstooApiResponse<StreamerResponseDto>> {
    const streamer = await this.streamersService.verifyStreamer(uuid, verifyDto.isVerified);
    return InstooApiResponse.success(streamer);
  }

  /**
   * [관리자] 방송인 삭제
   */
  @Delete("v1/streamers/:uuid")
  @ApiOperation({
    summary: "[관리자] 방송인 삭제",
    description: "방송인을 삭제합니다. 관리자만 삭제할 수 있습니다.",
  })
  @ApiParam({ name: "uuid", description: "방송인 UUID" })
  @ApiInstooSimpleResponses({
    success: {
      status: 204,
      description: "방송인 삭제 성공",
    },
    errors: [
      {
        status: 401,
        code: AuthErrorCode.AUTH_UNAUTHORIZED,
        description: "인증이 필요합니다.",
      },
      {
        status: 403,
        code: StreamerErrorCode.STREAMER_DELETE_ADMIN_ONLY,
        description: "관리자만 방송인을 삭제할 수 있습니다.",
      },
      {
        status: 404,
        code: StreamerErrorCode.STREAMER_NOT_FOUND,
        description: "방송인을 찾을 수 없습니다.",
      },
    ],
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param("uuid") uuid: string, @Req() req: AuthenticatedRequest): Promise<void> {
    await this.streamersService.remove(uuid, req.user!.sub, req.user!.role);
  }
}
