import { Module } from '@nestjs/common';
import { InvitationService } from './invitation.service';
import { InvitationController } from './invitation.controller';
import { Invitation } from './entities/invitation.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  controllers: [InvitationController],
  providers: [InvitationService],
  imports: [TypeOrmModule.forFeature([Invitation])],
})
export class InvitationModule {}
