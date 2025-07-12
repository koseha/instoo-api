import { AuthenticatedRequest, JwtAuthGuard } from "@/auth/guard/jwt-auth.guard";
import { ApiInstooResponses } from "@/common/decorators/api-response.decorator";
import { InstooApiResponse } from "@/common/dto/instoo-api-response.dto";
import { Body, Controller, Get, Param, Patch, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { UserInfoDto } from "../dto/user-response.dto";
import { UsersService } from "../services/users.service";
import { UpdateProfileDto } from "../dto/update-profile.dto";
import { UserErrorCode, AuthErrorCode } from "@/common/constants/api-error.enum";
import { AuthInfo } from "@/auth/strategies/jwt.strategy";

@ApiTags("Users")
@Controller()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get("v1/users/me")
  @ApiOperation({
    summary: "내 정보 조회",
    description: "현재 로그인한 사용자의 정보를 조회합니다.",
  })
  @ApiInstooResponses(UserInfoDto, {
    success: {
      status: 200,
      description: "내 정보 조회 성공",
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
    ],
  })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async getMyProfile(@Req() req: AuthenticatedRequest): Promise<InstooApiResponse<UserInfoDto>> {
    const userId = req.user!.sub;
    const user = await this.usersService.getUserByUuid(userId);
    return InstooApiResponse.success(user);
  }

  @Get("v1/users/:uuid")
  @ApiOperation({
    summary: "사용자 상세 조회",
    description: "UUID로 특정 사용자의 상세 정보를 조회합니다.",
  })
  @ApiInstooResponses(UserInfoDto, {
    success: {
      status: 200,
      description: "사용자 조회 성공",
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
    ],
  })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async findById(@Param("uuid") uuid: string): Promise<InstooApiResponse<UserInfoDto>> {
    const user = await this.usersService.getUserByUuid(uuid);
    return InstooApiResponse.success(user);
  }

  @Patch("v1/users/me")
  @ApiOperation({
    summary: "내 프로필 수정",
    description: "현재 로그인한 사용자의 프로필 정보를 수정합니다.",
  })
  @ApiInstooResponses(UserInfoDto, {
    success: {
      status: 200,
      description: "프로필 수정 성공",
    },
    errors: [
      {
        status: 400,
        code: UserErrorCode.USER_NO_UPDATE_CONTENT,
        description: "수정할 내용이 없습니다.",
      },
      {
        status: 400,
        code: UserErrorCode.USER_NICKNAME_SAME_AS_CURRENT,
        description: "현재 닉네임과 동일합니다.",
      },
      {
        status: 400,
        code: UserErrorCode.USER_NICKNAME_ALREADY_EXISTS,
        description: "이미 사용 중인 닉네임입니다.",
      },
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
    ],
  })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async updateMyProfile(
    @Body() updateProfileDto: UpdateProfileDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<InstooApiResponse<UserInfoDto>> {
    const currentUser: AuthInfo = req.user!;
    const user = await this.usersService.updateProfile(currentUser, updateProfileDto);
    return InstooApiResponse.success(user);
  }
}
