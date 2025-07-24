// src/streamers/controllers/streamer-follow.controller.ts
import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AuthenticatedRequest, JwtAuthGuard } from "@/auth/guard/jwt-auth.guard";
import { InstooApiResponse } from "@/common/dto/instoo-api-response.dto";
import { StreamerFollowService } from "../services/streamer-follow.service";
import { BatchUpdateFollowStatusDto, BatchUpdateItem } from "../dto/batch-update-follows.dto";
import { MyStreamerDto } from "@/users/dto/user-response.dto";

@ApiTags("Streamers")
@Controller()
export class StreamerFollowsController {
  constructor(private readonly streamerFollowService: StreamerFollowService) {}

  /**
   *
   * @param streamerUuid
   * @param req
   * @returns
   */
  @Post("v1/streamers/:uuid/follow")
  @ApiOperation({
    summary: "스트리머 팔로우",
    description: "스트리머 팔로우",
  })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async followStreamer(
    @Param("uuid") streamerUuid: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<InstooApiResponse<string>> {
    await this.streamerFollowService.followStreamer(req.user!.userUuid, streamerUuid);

    return InstooApiResponse.success("follow");
  }

  /**
   *
   * @param streamerUuid
   * @param req
   * @returns
   */
  @Delete("v1/streamers/:uuid/unfollow")
  @ApiOperation({
    summary: "스트리머 언팔로우",
    description: "스트리머 언팔로우",
  })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async unfollowStreamer(
    @Param("uuid") streamerUuid: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<InstooApiResponse<string>> {
    await this.streamerFollowService.unfollowStreamer(req.user!.userUuid, streamerUuid);
    return InstooApiResponse.success("unfollow");
  }

  /**
   * 사용자의 MyStreamers 목록 조회
   */
  @Get("v1/streamers/follows/my-streamers")
  @ApiOperation({
    summary: "내 스트리머 목록 조회",
    description: "팔로우 중인 스트리머 목록과 on/off 상태를 조회",
  })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async getMyStreamers(
    @Req() req: AuthenticatedRequest,
  ): Promise<InstooApiResponse<MyStreamerDto[]>> {
    const myStreamers = await this.streamerFollowService.getMyStreamers(req.user!.userUuid);

    return InstooApiResponse.success(myStreamers);
  }

  /**
   * 팔로우 상태 배치 업데이트
   */
  @Patch("v1/streamers/follows/batch")
  @ApiOperation({
    summary: "팔로우 상태 배치 업데이트",
    description: "여러 스트리머의 on/off 상태를 한번에 업데이트",
  })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async batchUpdateFollowStatus(
    @Body() updateDto: BatchUpdateFollowStatusDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<InstooApiResponse<string>> {
    await this.streamerFollowService.batchUpdateFollowStatus(req.user!.userUuid, updateDto.updates);

    return InstooApiResponse.success("배치 업데이트 완료");
  }
}
