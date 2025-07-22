// src/streamers/controllers/streamer-follow.controller.ts
import { Controller, Delete, Param, Post, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AuthenticatedRequest, JwtAuthGuard } from "@/auth/guard/jwt-auth.guard";
import { InstooApiResponse } from "@/common/dto/instoo-api-response.dto";
import { StreamerFollowService } from "../services/streamer-follow.service";

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
}
