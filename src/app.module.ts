import { Module } from '@nestjs/common';
import { CoreModule } from './core/core.module';
import { UserModule } from './modules/user/user.module';
import { AuthModule } from './modules/auth/auth.module';
import { ClubModule } from './modules/club/club.module';
import { TeamModule } from './modules/team/team.module';
import { MemberModule } from './modules/member/member.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { InvitationModule } from './modules/invitation/invitation.module';
import { ApplicationModule } from './modules/application/application.module';

/**
 * The root module of the application and the starting point.
 *
 * It imports all other.
 */
@Module({
  imports: [
    CoreModule,
    UserModule,
    AuthModule,
    ClubModule,
    TeamModule,
    MemberModule,
    AnalyticsModule,
    InvitationModule,
    ApplicationModule,
  ],
})
export class AppModule {}
