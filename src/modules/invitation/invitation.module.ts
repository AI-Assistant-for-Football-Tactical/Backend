import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InvitationService } from './invitation.service';
import { InvitationController } from './invitation.controller';
import { AdminInvitationsController } from './admin-invitation.controller';
import { Invitation } from './entities/invitation.entity';
import { InvitationRepository } from './repositories/invitation.repository';
import { UserModule } from '../user/user.module';
import { ClubModule } from '../club/club.module';
import { ActiveClubGuard } from '../../common/guards/active-club.guard';

/**
 * Invitation module registering controllers, services, repositories, and TypeORM.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Invitation]),
    forwardRef(() => UserModule),
    ClubModule,
  ],
  controllers: [InvitationController, AdminInvitationsController],
  providers: [InvitationService, InvitationRepository, ActiveClubGuard],
  exports: [InvitationService, InvitationRepository],
})
export class InvitationModule {}
