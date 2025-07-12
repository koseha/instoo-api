import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { User } from "../entities/user.entity";
import { Repository } from "typeorm";
import { UserInfoDto } from "../dto/user-response.dto";
import { UpdateProfileDto } from "../dto/update-profile.dto";
import { ApiException, ApiNotFoundException } from "@/common/exceptions/api-exceptions";
import { UserErrorCode } from "@/common/constants/api-error.enum";
import { AuthInfo } from "@/auth/strategies/jwt.strategy";

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * UUID로 사용자 조회 (인증용)
   */
  async findByUuid(uuid: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { uuid, isActive: true },
    });
    if (!user) {
      throw new ApiNotFoundException(UserErrorCode.USER_NOT_FOUND);
    }
    return user;
  }
  /**
   * UUID로 사용자 정보 조회 (컨트롤러의 findById용)
   */
  async getUserByUuid(userId: string): Promise<UserInfoDto> {
    const user = await this.findByUuid(userId);
    return UserInfoDto.of(user);
  }

  /**
   * 사용자 존재 여부 확인
   */
  async exists(uuid: string): Promise<boolean> {
    const count = await this.userRepository.count({
      where: { uuid, isActive: true },
    });
    return count > 0;
  }

  /**
   * 이메일 중복 체크
   */
  async isEmailExists(email: string, excludeUserId?: number): Promise<boolean> {
    const queryBuilder = this.userRepository
      .createQueryBuilder("user")
      .where("user.email = :email", { email })
      .andWhere("user.isActive = :isActive", { isActive: true });

    if (excludeUserId) {
      queryBuilder.andWhere("user.id != :excludeUserId", { excludeUserId });
    }

    const count = await queryBuilder.getCount();
    return count > 0;
  }

  /**
   * 사용자 프로필 수정
   */
  async updateProfile(currentUser: AuthInfo, updateData: UpdateProfileDto): Promise<UserInfoDto> {
    const { userUuid, nickname } = currentUser;

    // 업데이트할 데이터를 수집
    const updateFields: Partial<User> = {
      updatedAt: new Date(),
    };

    if (updateData.nickname !== undefined) {
      await this.validateNickname(updateData.nickname, nickname, userUuid);
      updateFields.nickname = updateData.nickname;
    }

    // 실제 업데이트할 필드가 있는지 확인
    const hasUpdates = Object.keys(updateFields).length > 1; // updatedAt 제외
    if (!hasUpdates) {
      throw new ApiException(UserErrorCode.USER_NO_UPDATE_CONTENT);
    }

    await this.userRepository.update({ uuid: userUuid, isActive: true }, updateFields);

    const updatedUser = await this.findByUuid(userUuid);
    return UserInfoDto.of(updatedUser);
  }

  /**
   * 닉네임 중복 체크
   */
  async isNicknameExists(nickname: string, excludeUserId?: string): Promise<boolean> {
    const queryBuilder = this.userRepository
      .createQueryBuilder("user")
      .where("user.nickname = :nickname", { nickname })
      .andWhere("user.isActive = :isActive", { isActive: true });

    if (excludeUserId) {
      queryBuilder.andWhere("user.uuid != :excludeUserId", { excludeUserId });
    }

    const count = await queryBuilder.getCount();
    return count > 0;
  }

  /**
   * 닉네임 검증 (내부 메서드)
   */
  private async validateNickname(newNickname: string, nickname, userUuid): Promise<void> {
    // 현재 닉네임과 동일한지 확인
    if (nickname === newNickname) {
      throw new ApiException(UserErrorCode.USER_NICKNAME_SAME_AS_CURRENT);
    }

    // 닉네임 중복 확인
    const isDuplicate = await this.isNicknameExists(newNickname, userUuid);
    if (isDuplicate) {
      throw new ApiException(UserErrorCode.USER_NICKNAME_ALREADY_EXISTS);
    }
  }
}
