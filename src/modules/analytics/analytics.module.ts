import { Module } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AnalyticsController } from './analytics.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Analytics } from './entities/analytics.entity';

@Module({
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  imports: [TypeOrmModule.forFeature([Analytics])],
})
export class AnalyticsModule {}
