import { Module } from '@nestjs/common';
import { InmatchService } from './inmatch.service';
import { InmatchController } from './inmatch.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Club } from '../club/entities/club.entity';
import { SofaScoreProvider } from './providers/sofa-score.provider';
import { MatchStatistics } from './entities/statistics.entity';
import { MatchLineups } from './entities/lineups.entity';
import { MatchShotmap } from './entities/shotmap.entity';
import { PlayerHeatmap } from './entities/playerHeatmap.entity';
import { PlayerRatingBreakdown } from './entities/player-rating-breakdown';
import { InMatchProvider } from './providers/ai-client-provider';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Club,
      MatchStatistics,
      MatchLineups,
      MatchShotmap,
      PlayerHeatmap,
      PlayerRatingBreakdown,
    ]),
  ],
  controllers: [InmatchController],
  providers: [InmatchService, SofaScoreProvider, InMatchProvider],
})
export class InmatchModule {}
