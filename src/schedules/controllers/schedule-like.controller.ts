// src/schedules/controllers/schedules.controller.ts
import { Controller, Delete, Param, Post, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AuthenticatedRequest, JwtAuthGuard } from "@/auth/guard/jwt-auth.guard";
import { ScheduleLikesService } from "../services/schedule-likes.service";
import { InstooApiResponse } from "@/common/dto/instoo-api-response.dto";

@ApiTags("Schedules")
@Controller()
export class ScheduleLikesController {
  constructor(private readonly scheduleLikesService: ScheduleLikesService) {}

  @Post("v1/schedules/:uuid/like")
  @ApiOperation({
    summary: "일정 좋아요",
    description: "일정 좋아요",
  })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async addLike(
    @Param("uuid") scheduleUuid: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<InstooApiResponse<string>> {
    await this.scheduleLikesService.addLike(scheduleUuid, req.user!.userUuid);
    return InstooApiResponse.success("like");
  }

  @Delete("v1/schedules/:uuid/unlike")
  @ApiOperation({
    summary: "일정 좋아요 취소",
    description: "일정 좋아요 취소",
  })
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  async removeLike(@Param("uuid") scheduleUuid: string, @Req() req: AuthenticatedRequest) {
    await this.scheduleLikesService.removeLike(scheduleUuid, req.user!.userUuid);
    return InstooApiResponse.success("unlike");
  }
}
