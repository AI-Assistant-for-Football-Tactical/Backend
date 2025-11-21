import { Module } from '@nestjs/common';
import { ApplicationService } from './application.service';
import { ApplicationController } from './application.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClubApplication } from './entities/club-application.entity';

@Module({
  controllers: [ApplicationController],
  providers: [ApplicationService],
  imports: [TypeOrmModule.forFeature([ClubApplication])],
})
export class ApplicationModule {}
