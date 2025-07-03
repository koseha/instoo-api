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
  ParseIntPipe,
  Req,
  BadRequestException,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from "@nestjs/swagger";
import { StreamersService } from "../services/streamers.service";
import { CreateStreamerDto } from "../dto/create-streamer.dto";
import { UpdateStreamerDto } from "../dto/update-streamer.dto";
import { QueryStreamersDto } from "../dto/query-streamers.dto";
import {
  StreamerResponseDto,
  PagedStreamerResponseDto,
  StreamerAutocompleteDto,
  VerifyStreamerDto,
} from "../dto/streamer-response.dto";
import { InstooApiResponse } from "@/common/dto/instoo-api-response.dto";
import {
  ApiInstooResponse,
  ApiInstooErrorResponse,
  ApiInstooResponses,
  ApiInstooArrayResponse,
  ApiInstooSimpleResponses,
} from "@/common/decorators/api-response.decorator";
import { AuthenticatedRequest, JwtAuthGuard } from "@/auth/guard/jwt-auth.guard";
import { RolesGuard } from "@/auth/guard/role.guard";
import { Roles } from "@/auth/decorators/roles.decorator";
import { UserRole } from "@/common/constants/user-role.enum";

@ApiTags("Streamers")
@Controller("streamers")
export class StreamersController {
  constructor(private readonly streamersService: StreamersService) {}

  @Post()
  @ApiOperation({
    summary: "방송인 생성",
    description: "새로운 방송인을 생성합니다. 인증된 사용자만 생성할 수 있습니다.",
  })
  @ApiInstooResponse(StreamerResponseDto, {
    status: 201,
    description: "방송인 생성 성공",
  })
  @ApiInstooErrorResponse(400, "잘못된 요청", {
    code: "BAD_REQUEST",
    message: "요청 데이터가 올바르지 않습니다.",
  })
  @ApiInstooErrorResponse(401, "인증 실패", {
    code: "UNAUTHORIZED",
    message: "인증이 필요합니다.",
  })
  @ApiInstooErrorResponse(409, "중복된 방송인", {
    code: "STREAMER_ALREADY_EXISTS",
    message: "해당 이름과 플랫폼 조합의 방송인이 이미 존재합니다.",
  })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async create(
    @Body() createStreamerDto: CreateStreamerDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<InstooApiResponse<StreamerResponseDto>> {
    const streamer = await this.streamersService.create(createStreamerDto, req.user!.sub);
    return InstooApiResponse.success(streamer, "방송인이 성공적으로 생성되었습니다.");
  }

  @Get()
  @ApiOperation({
    summary: "방송인 목록 조회",
    description: "무한 스크롤링을 지원하는 방송인 목록을 조회합니다.",
  })
  @ApiInstooResponse(PagedStreamerResponseDto, {
    status: 200,
    description: "방송인 목록 조회 성공",
  })
  async findAll(
    @Query() query: QueryStreamersDto,
  ): Promise<InstooApiResponse<PagedStreamerResponseDto>> {
    const result = await this.streamersService.findAll(query);
    return InstooApiResponse.success(result, "방송인 목록을 성공적으로 조회했습니다.");
  }

  @Get("search/autocomplete")
  @ApiOperation({
    summary: "방송인 자동완성 검색",
    description: "방송인 이름으로 자동완성 검색을 수행합니다.",
  })
  @ApiInstooArrayResponse(StreamerAutocompleteDto, {
    status: 200,
    description: "자동완성 검색 성공",
  })
  @ApiInstooErrorResponse(400, "잘못된 요청", {
    code: "BAD_REQUEST",
    message: "검색어는 최소 2글자 이상이어야 합니다.",
  })
  async autocomplete(
    @Query("q") query: string,
    @Query("limit") limit: number = 10,
  ): Promise<InstooApiResponse<StreamerAutocompleteDto[]>> {
    if (!query || query.trim().length < 2) {
      throw new BadRequestException("검색어는 최소 2글자 이상이어야 합니다.");
    }

    const searchQuery = new QueryStreamersDto();
    searchQuery.name = query.trim();
    searchQuery.limit = Math.min(limit, 10);
    searchQuery.sortBy = "name";
    searchQuery.sortOrder = "ASC";

    const result = await this.streamersService.findAll(searchQuery);

    const autocompleteData: StreamerAutocompleteDto[] = result.data.map((streamer) => ({
      id: streamer.id,
      uuid: streamer.uuid,
      name: streamer.name,
      profileImageUrl: streamer.profileImageUrl,
      isVerified: streamer.isVerified,
      platforms: streamer.platforms?.map((p) => p.platformName) || [],
    }));

    return InstooApiResponse.success(autocompleteData, "자동완성 결과를 성공적으로 조회했습니다.");
  }

  @Get(":id")
  @ApiOperation({
    summary: "방송인 상세 조회",
    description: "ID로 특정 방송인의 상세 정보를 조회합니다.",
  })
  @ApiParam({ name: "id", description: "방송인 ID" })
  @ApiInstooResponses(StreamerResponseDto, {
    success: {
      status: 200,
      description: "방송인 조회 성공",
    },
    errors: [
      {
        status: 404,
        description: "방송인을 찾을 수 없음",
        code: "STREAMER_NOT_FOUND",
        message: "해당 방송인을 찾을 수 없습니다.",
      },
    ],
  })
  async findOne(
    @Param("id", ParseIntPipe) id: number,
  ): Promise<InstooApiResponse<StreamerResponseDto>> {
    const streamer = await this.streamersService.findOne(id);
    return InstooApiResponse.success(streamer, "방송인 정보를 성공적으로 조회했습니다.");
  }

  @Get("uuid/:uuid")
  @ApiOperation({
    summary: "방송인 UUID로 조회",
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
        description: "방송인을 찾을 수 없음",
        code: "STREAMER_NOT_FOUND",
        message: "해당 방송인을 찾을 수 없습니다.",
      },
    ],
  })
  async findByUuid(@Param("uuid") uuid: string): Promise<InstooApiResponse<StreamerResponseDto>> {
    const streamer = await this.streamersService.findByUuid(uuid);
    return InstooApiResponse.success(streamer, "방송인 정보를 성공적으로 조회했습니다.");
  }

  @Patch(":id")
  @ApiOperation({
    summary: "방송인 정보 수정",
    description:
      "방송인 정보를 수정합니다. 로그인한 사용자 누구나 수정할 수 있습니다. 충돌 방지를 위해 기존 방송인의 updatedAt 값을 lastUpdatedAt으로 전송해야 합니다.",
  })
  @ApiParam({ name: "id", description: "방송인 ID" })
  @ApiInstooResponses(StreamerResponseDto, {
    success: {
      status: 200,
      description: "방송인 수정 성공",
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
        status: 404,
        description: "방송인을 찾을 수 없음",
        code: "STREAMER_NOT_FOUND",
        message: "해당 방송인을 찾을 수 없습니다.",
      },
      {
        status: 409,
        description: "충돌 발생",
        code: "CONFLICT",
        message: "방송인 정보가 다른 사용자에 의해 수정되었습니다.",
      },
    ],
  })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async update(
    @Param("id", ParseIntPipe) id: number,
    @Body() updateStreamerDto: UpdateStreamerDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<InstooApiResponse<StreamerResponseDto>> {
    const streamer = await this.streamersService.update(
      id,
      updateStreamerDto,
      req.user!.sub,
      req.user!.role,
    );
    return InstooApiResponse.success(streamer, "방송인 정보를 성공적으로 수정했습니다.");
  }

  @Delete(":id")
  @ApiOperation({
    summary: "방송인 삭제",
    description: "방송인을 삭제합니다. 관리자만 삭제할 수 있습니다.",
  })
  @ApiParam({ name: "id", description: "방송인 ID" })
  @ApiInstooSimpleResponses({
    success: {
      status: 204,
      description: "방송인 삭제 성공",
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
        message: "관리자만 방송인을 삭제할 수 있습니다.",
      },
      {
        status: 404,
        description: "방송인을 찾을 수 없음",
        code: "STREAMER_NOT_FOUND",
        message: "해당 방송인을 찾을 수 없습니다.",
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
    await this.streamersService.remove(id, req.user!.sub, req.user!.role);
  }

  @Patch(":id/verify")
  @ApiOperation({
    summary: "방송인 인증 상태 변경",
    description: "방송인의 인증 상태를 변경합니다. 관리자만 변경할 수 있습니다.",
  })
  @ApiParam({ name: "id", description: "방송인 ID" })
  @ApiInstooResponses(StreamerResponseDto, {
    success: {
      status: 200,
      description: "방송인 인증 상태 변경 성공",
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
        message: "관리자만 방송인 인증 상태를 변경할 수 있습니다.",
      },
      {
        status: 404,
        description: "방송인을 찾을 수 없음",
        code: "STREAMER_NOT_FOUND",
        message: "해당 방송인을 찾을 수 없습니다.",
      },
    ],
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  async verifyStreamer(
    @Param("id", ParseIntPipe) id: number,
    @Body() verifyDto: VerifyStreamerDto,
  ): Promise<InstooApiResponse<StreamerResponseDto>> {
    const streamer = await this.streamersService.verifyStreamer(id, verifyDto.isVerified);
    const message = verifyDto.isVerified
      ? "방송인이 성공적으로 인증되었습니다."
      : "방송인 인증이 해제되었습니다.";
    return InstooApiResponse.success(streamer, message);
  }
}
