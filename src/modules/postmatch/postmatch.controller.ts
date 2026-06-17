import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { CurrentUser } from '../..//common/decorators/current-user.decorator';
import type { AccessTokenPayload } from '../auth/constants/token-payload.type';
import { PostmatchService } from './postmatch.service';
import type { PostMatchReport } from './entities/postmatch-report.entity';
import { AnalyzeMatchDto } from './dto/analyze-match.dto';
import { ListReportsQueryDto } from './dto/postmatch-report.dto';

@ApiTags('Post-Match Analysis')
@ApiBearerAuth()
@Controller('post-match')
export class PostmatchController {
  constructor(private readonly postmatchService: PostmatchService) {}

  /**
   * Triggers a post-match analysis for a given match and team.
   *
   * @param dto - Contains eventId and teamId.
   * @param user - JWT payload with user ID and club ID.
   * @returns The analysis report and a cached flag.
   */
  @Post('analyze')
  @ApiOperation({
    summary: 'Trigger a post-match analysis',
    description:
      'Analyzes a completed match using the AI service and generates an LLM explanation. Returns a cached report if one already exists for this match.',
  })
  @ResponseMessage('Post-match analysis completed successfully.')
  async analyze(
    @Body() dto: AnalyzeMatchDto,
    @CurrentUser() user: AccessTokenPayload,
  ) {
    const { report, cached } = await this.postmatchService.analyzeMatch(
      dto.eventId,
      dto.teamId,
      user.id,
      user.club_id,
    );

    return this.toReportResponse(report, cached);
  }

  /**
   * Returns a paginated list of reports belonging to the user's club.
   *
   * @param query - Pagination parameters (page, limit).
   * @param user - JWT payload with club ID.
   * @returns Paginated list of report summaries.
   */
  @Get('reports')
  @ApiOperation({
    summary: 'List post-match reports',
    description: 'Returns a paginated list of cached reports.',
  })
  @ResponseMessage('Reports retrieved successfully.')
  async listReports(
    @Query() query: ListReportsQueryDto,
    @CurrentUser() user: AccessTokenPayload,
  ) {
    const { reports, total, page, limit } =
      await this.postmatchService.getReports(
        user.club_id,
        query.page!,
        query.limit!,
      );

    return {
      reports: reports.map((r) => this.toReportSummary(r)),
      total,
      page,
      limit,
    };
  }

  /**
   * Retrieves a single report by ID with club-based access control.
   *
   * @param id - UUID of the report.
   * @param user - JWT payload with club ID.
   * @returns The full report including raw analysis and LLM explanation.
   */
  @Get('reports/:id')
  @ApiOperation({
    summary: 'Get a specific post-match report',
    description:
      'Returns the full report including raw analysis and LLM explanation.',
  })
  @ResponseMessage('Report retrieved successfully.')
  async getReport(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AccessTokenPayload,
  ) {
    const report = await this.postmatchService.getReport(id, user.club_id);
    return this.toReportResponse(report, true);
  }

  /**
   * Retries the LLM explanation for a PARTIAL report.
   *
   * @param id - UUID of the report to retry.
   * @param user - JWT payload with club ID.
   * @returns The updated report with a new LLM explanation.
   */
  @Post('reports/:id/explain')
  @ApiOperation({
    summary: 'Retry LLM explanation for a partial report',
    description:
      'Re-runs the LLM explanation step for a report that has status PARTIAL. Does NOT re-run the AI analysis.',
  })
  @ResponseMessage('LLM explanation generated successfully.')
  async retryExplanation(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AccessTokenPayload,
  ) {
    const report = await this.postmatchService.retryExplanation(
      id,
      user.club_id,
    );
    return this.toReportResponse(report, false);
  }

  /**
   * Maps a PostMatchReport entity to the full API response shape.
   *
   * @param report - The report entity.
   * @param cached - Whether the report was returned from cache.
   * @returns Formatted response object.
   */
  private toReportResponse(report: PostMatchReport, cached: boolean) {
    return {
      id: report.id,
      eventId: report.event_id,
      teamId: report.team_id,
      status: report.status,
      rawAnalysis: report.raw_analysis,
      llmExplanation: report.llm_explanation,
      llmModel: report.llm_model,
      analysisTimestamp: report.analysis_timestamp,
      createdAt: report.created_at,
      cached,
    };
  }

  /**
   * Maps a PostMatchReport entity to a lightweight summary for list endpoints.
   *
   * @param report - The report entity.
   * @returns Summary object without raw analysis or LLM explanation.
   */
  private toReportSummary(report: PostMatchReport) {
    return {
      id: report.id,
      eventId: report.event_id,
      teamId: report.team_id,
      status: report.status,
      analysisTimestamp: report.analysis_timestamp,
      createdAt: report.created_at,
    };
  }
}
