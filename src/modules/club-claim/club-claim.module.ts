import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Claim } from './entities/claim.entity';
import { Club } from '../club/entities/club.entity';
import { User } from '../user/entities/user.entity';
import { Invitation } from '../invitation/entities/invitation.entity';

import { ClaimRepository } from './repositories/claim.repository';
import { ClubRepository } from '../club/repositories/club.repository';
import { UserRepository } from '../user/repositories/user.repository';

import { ClubClaimService } from './club-claim.service';
import { ClaimsController } from './controllers/claims.controller';
import { AdminClaimsController } from './controllers/admin-claims.controller';
import { ClubModule } from '../club/club.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Claim, Club, User, Invitation]),
    forwardRef(() => ClubModule),
    forwardRef(() => UserModule),
  ],
  controllers: [ClaimsController, AdminClaimsController],
  providers: [
    ClaimRepository,
    ClubRepository,
    UserRepository,
    ClubClaimService,
  ],
  exports: [ClubClaimService, ClaimRepository],
})
export class ClubClaimModule {}
