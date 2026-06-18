import { Module } from '@nestjs/common';
import { InmatchService } from './inmatch.service';
import { InmatchController } from './inmatch.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Club } from '../club/entities/club.entity';
import { SofaScoreProvider } from './providers/sofa-score.provider';
import { InMatchProvider } from './providers/ai-client-provider';

@Module({
  imports: [TypeOrmModule.forFeature([Club])],
  controllers: [InmatchController],
  providers: [InmatchService, SofaScoreProvider, InMatchProvider],
})
export class InmatchModule {}
