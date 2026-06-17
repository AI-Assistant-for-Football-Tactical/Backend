import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Club } from './entities/club.entity';
import { User } from '../user/entities/user.entity';
import { AuthToken } from '../auth/entities/token.entity';

import { ClubRepository } from './repositories/club.repository';
import { UserRepository } from '../user/repositories/user.repository';

// Controllers
import { ClubController } from './controllers/club.controller';
import { AdminClubController } from './controllers/admin-club.controller';

// Service
import { ClubService } from './club.service';
import { UserModule } from '../user/user.module';
import { ActiveClubGuard } from '../../common/guards/active-club.guard';

/**
 * ClubModule owns all club-related domain logic:
 * - Club governance (view, leave, succession)
 * - Admin oversight (list clubs, update club status)
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Club, User, AuthToken]),
    forwardRef(() => UserModule),
  ],
  controllers: [ClubController, AdminClubController],
  providers: [ClubRepository, UserRepository, ClubService, ActiveClubGuard],
  exports: [ClubRepository, ClubService],
})
export class ClubModule {}
