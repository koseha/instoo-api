import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { User } from "./entities/user.entity";
import { Repository } from "typeorm";
import { UserInfoDto } from "./dto/user-response.dto";

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * 이메일로 사용자 조회 (인증용)
   */
  async findByUuid(uuid: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { uuid, isActive: true },
    });
    if (!user) throw new NotFoundException("사용자가 없습니다");
    return user;
  }

  /**
   * 현재 로그인한 사용자 정보 조회
   */
  async getMyProfile(userId: string): Promise<UserInfoDto> {
    const user = await this.findByUuid(userId);
    return UserInfoDto.of(user);
  }

  /**
   * 사용자 존재 여부 확인
   */
  async exists(id: number): Promise<boolean> {
    const count = await this.userRepository.count({
      where: { id, isActive: true },
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
}
