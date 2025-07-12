import { AuthenticatedRequest, JwtAuthGuard } from "@/auth/guard/jwt-auth.guard";
import {
  ApiInstooErrorResponse,
  ApiInstooResponse,
  ApiInstooResponses,
} from "@/common/decorators/api-response.decorator";
import { InstooApiResponse } from "@/common/dto/instoo-api-response.dto";
import { Body, Controller, Get, Param, Patch, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { UserInfoDto } from "../dto/user-response.dto";
import { RolesGuard } from "@/auth/guard/role.guard";
import { Roles } from "@/auth/decorators/roles.decorator";
import { UserRole } from "@/common/constants/user-role.enum";
import { UsersService } from "../services/users.service";
import { UpdateProfileDto } from "../dto/update-profile.dto";

@ApiTags("Users")
@Controller()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get("v1/users/me")
  @ApiOperation({
    summary: "내 정보 조회",
    description: "현재 로그인한 사용자의 정보를 조회합니다.",
  })
  @ApiInstooResponse(UserInfoDto, {
    status: 200,
    description: "내 정보 조회 성공",
  })
  @ApiInstooErrorResponse(401, "인증 실패", {
    code: "UNAUTHORIZED",
    message: "인증이 필요합니다.",
  })
  @ApiInstooErrorResponse(404, "사용자를 찾을 수 없음", {
    code: "USER_NOT_FOUND",
    message: "사용자를 찾을 수 없습니다.",
  })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async getMyProfile(@Req() req: AuthenticatedRequest): Promise<InstooApiResponse<UserInfoDto>> {
    const userId = req.user!.sub;
    const user = await this.usersService.getMyProfile(userId);
    return InstooApiResponse.success(user, "내 정보를 성공적으로 조회했습니다.");
  }

  @Get("v1/users/:uuid")
  @ApiOperation({
    summary: "사용자 상세 조회",
    description: "ID로 특정 사용자의 상세 정보를 조회합니다.",
  })
  @ApiInstooResponses(UserInfoDto, {
    success: {
      status: 200,
      description: "사용자 조회 성공",
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
        message: "해당 사용자 정보에 접근할 권한이 없습니다.",
      },
      {
        status: 404,
        description: "사용자를 찾을 수 없음",
        code: "USER_NOT_FOUND",
        message: "사용자를 찾을 수 없습니다.",
      },
    ],
  })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async findById(@Param("uuid") uuid: string): Promise<InstooApiResponse<UserInfoDto>> {
    const user = await this.usersService.getMyProfile(uuid);
    return InstooApiResponse.success(user, "사용자 정보를 성공적으로 조회했습니다.");
  }

  @Patch("v1/users/me")
  @ApiOperation({
    summary: "내 닉네임 수정",
    description: "현재 로그인한 사용자의 닉네임을 수정합니다.",
  })
  @ApiInstooResponse(UserInfoDto, {
    status: 200,
    description: "닉네임 수정 성공",
  })
  @ApiInstooErrorResponse(400, "잘못된 요청", {
    code: "BAD_REQUEST",
    message: "닉네임 형식이 올바르지 않거나 이미 사용 중인 닉네임입니다.",
  })
  @ApiInstooErrorResponse(401, "인증 실패", {
    code: "UNAUTHORIZED",
    message: "인증이 필요합니다.",
  })
  @ApiInstooErrorResponse(404, "사용자를 찾을 수 없음", {
    code: "USER_NOT_FOUND",
    message: "사용자를 찾을 수 없습니다.",
  })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async updateMyNickname(
    @Body() updateProfileDto: UpdateProfileDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<InstooApiResponse<UserInfoDto>> {
    const userId = req.user!.sub;
    const user = await this.usersService.updateProfile(userId, updateProfileDto);
    return InstooApiResponse.success(user, "닉네임을 성공적으로 수정했습니다.");
  }
}
