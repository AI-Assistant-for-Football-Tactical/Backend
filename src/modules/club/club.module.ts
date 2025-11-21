import { Module } from '@nestjs/common';
import { ClubService } from './club.service';
import { ClubController } from './club.controller';
import { Club } from './entities/club.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  controllers: [ClubController],
  providers: [ClubService],
  imports: [TypeOrmModule.forFeature([Club])],
})
export class ClubModule {}
