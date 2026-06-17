import { Controller, Get } from '@nestjs/common';
import { InmatchService } from './inmatch.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

/**
 * Controller for in-match analysis endpoints.
 *
 * Provides real-time or cached AI-generated analysis for a club's ongoing match.
 * to resolve the current user's club via the {@link CurrentUser} decorator.
 */
@ApiTags('In-Match Analysis')
@ApiBearerAuth()
@Controller('in-match')
export class InmatchController {
  constructor(private readonly inmatchService: InmatchService) {}
  /**
   * Retrieves in-match analysis data for the authenticated user's club.
   *
   * Delegates to {@link InmatchService.inMatchData}, which serves from cache
   * if a fresh result exists, or triggers a full fetch + AI analysis pipeline.
   *
   * @param clubId - The club ID extracted from the current user's JWT payload.
   * @returns The in-match analysis result, or `'Match finished'` if the match has ended.
   * @throws {HttpException} 429 if AI processing is already in progress.
   * @throws {NotFoundException} If the club, event, or opponent cannot be resolved.
   * @throws {InternalServerErrorException} If the AI provider call fails.
   */
  @Get()
  getInMatch(@CurrentUser('club_id') clubId: string) {
    return this.inmatchService.inMatchData(clubId);
  }
}
