import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { User } from "@/users/entities/user.entity";
import { UsersService } from "./services/users.service";
import { UsersController } from "./controllers/users.controller";
import { AuthModule } from "@/auth/auth.module";

@Module({
  imports: [TypeOrmModule.forFeature([User]), AuthModule],
  providers: [UsersService],
  controllers: [UsersController],
})
export class UsersModule {}
