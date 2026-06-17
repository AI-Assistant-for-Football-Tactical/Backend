import { Module, forwardRef } from '@nestjs/common';
import { UserService } from './user.service';
import { FavoriteService } from './favorite.service';
import { UserController } from './user.controller';
import { FavoriteController } from './favorite.controller';
import { AdminUserController } from './admin-user.controller';
import { User } from './entities/user.entity';
import { Favorite } from './entities/favorite.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UserRepository } from './repositories/user.repository';
import { FavoriteRepository } from './repositories/favorite.repository';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Favorite]),
    forwardRef(() => AuthModule),
  ],
  controllers: [UserController, FavoriteController, AdminUserController],
  providers: [UserService, FavoriteService, UserRepository, FavoriteRepository],
  exports: [UserService, FavoriteService, UserRepository, FavoriteRepository],
})
export class UserModule {}
