import {
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PinoLogger } from 'nestjs-pino';
import { Club } from '../club/entities/club.entity';
import { Repository } from 'typeorm';
import { SofaScoreProvider } from './providers/sofa-score.provider';
import { CACHE_TTL } from './constants/constant';
import { InMatchProvider } from './providers/ai-client-provider';

@Injectable()
export class InmatchService {
  /** Prevents concurrent AI analysis requests from overlapping. */
  isAiProcessing = false;

  /**
   * In-memory cache keyed by clubId.
   * Each entry stores the result and the timestamp it was cached at.
   */
  private cache = new Map<
    string,
    {
      result: any;
      cachedAt: number;
    }
  >();

  constructor(
    private readonly logger: PinoLogger,
    @InjectRepository(Club)
    private readonly clubRepo: Repository<Club>,
    private readonly sofaScore: SofaScoreProvider,
    private readonly inMatchProvider: InMatchProvider,
  ) {}

  /**
   * Returns in-match analysis data for a given club.
   *
   * Serves from cache if a fresh result exists (within {@link CACHE_TTL}).
   * Throws {@link HttpException} with 429 if AI processing is already in progress.
   *
   * @param clubId - The internal UUID of the club to fetch data for.
   * @returns The cached or freshly fetched in-match analysis result.
   * @throws {HttpException} 429 if a prior request is still being processed.
   */
  async inMatchData(clubId: string) {
    this.logger.info(`[Club ${clubId}] Received inMatchData request`);
    if (this.isAiProcessing) {
      this.logger.warn(
        `[Club ${clubId}] There is a request in progress — rejecting request`,
      );
      throw new HttpException('wait 12 minute', HttpStatus.TOO_MANY_REQUESTS);
    }

    const cached = this.cache.get(clubId);
    if (cached && Date.now() - cached.cachedAt < CACHE_TTL) {
      this.logger.info(
        `[Club ${clubId}] Returning cached result (age: ${Date.now() - cached.cachedAt}ms)`,
      );
      return cached.result;
    }

    this.logger.info(
      `[Club ${clubId}] Cache miss or expired — fetching fresh data`,
    );
    this.cache.delete(clubId);

    const result = await this.fetchInMatchData(clubId);
    this.cache.set(clubId, { result, cachedAt: Date.now() });
    this.logger.info(`[Club ${clubId}] Result cached successfully`);
    return result;
  }

  /**
   * Performs the full in-match data fetch pipeline for a club.
   *
   * Steps:
   * 1. Resolves the club's SofaScore team ID.
   * 2. Fetches the current event and opponent IDs.
   * 3. Checks if the match is already finished.
   * 4. Collects two match snapshots 10 minutes apart.
   * 5. Sends both snapshots to the AI provider for analysis.
   *
   * Sets {@link isAiProcessing} to `true` for the duration and resets it in `finally`.
   *
   * @param clubId - The internal UUID of the club.
   * @returns The AI-generated in-match analysis, or the string `'Match finished'` if the match has ended.
   * @throws {NotFoundException} If the club, opponent, or match status cannot be found.
   * @throws {InternalServerErrorException} If the AI provider call fails.
   */
  private async fetchInMatchData(clubId: string) {
    this.logger.info(`[Club ${clubId}] Starting fetchInMatchData`);
    this.isAiProcessing = true;

    const club = await this.clubRepo.findOneBy({
      id: clubId,
    });

    if (!club) {
      this.logger.warn(`[Club ${clubId}] Club not found in database`);
      throw new NotFoundException('Not found club');
    }

    const teamId = Number(club.sofa_score_club_id);
    this.logger.info(`[Club ${clubId}] Resolved SofaScore team ID: ${teamId}`);

    const eventId = await this.sofaScore.getEventId(teamId);
    this.logger.info(`[Club ${clubId}] Event ID: ${eventId}`);

    const opponentId = await this.sofaScore.getOpponentId(teamId);
    if (!opponentId) {
      this.logger.warn(
        `[Club ${clubId}] Opponent ID not found for team ${teamId}`,
      );
      throw new NotFoundException('not found opponent id');
    }
    this.logger.info(`[Club ${clubId}] Opponent ID: ${opponentId}`);

    const isMatchFinished = await this.sofaScore.isMatchFinished(eventId);
    if (isMatchFinished === null) {
      this.logger.warn(
        `[Club ${clubId}] Match status is null for event ${eventId}`,
      );
      throw new NotFoundException('match status not found');
    }

    if (isMatchFinished) {
      this.logger.info(`[Club ${clubId}] Match ${eventId} is already finished`);
      return 'Match finished';
    }

    this.logger.info(
      `[Club ${clubId}] Collecting snapshot 1 for event ${eventId}`,
    );
    const snapshot1 = await this.collectSnapshot(eventId, teamId, opponentId);

    this.logger.info(
      `[Club ${clubId}] Waiting 10 minutes before collecting snapshot 2`,
    );
    await new Promise((res) => setTimeout(res, 60000 * 10));

    this.logger.info(
      `[Club ${clubId}] Collecting snapshot 2 for event ${eventId}`,
    );
    const snapshot2 = await this.collectSnapshot(eventId, teamId, opponentId);

    const body = {
      target_team_id: teamId,
      statistics1: snapshot1.statistics,
      statistics2: snapshot2.statistics,
      lineups1: snapshot1.lineups,
      lineups2: snapshot2.lineups,
      shotmap1: snapshot1.shotmap,
      shotmap2: snapshot2.shotmap,
      heatmap1: snapshot1.heatmap,
      heatmap2: snapshot2.heatmap,
      ratingBreakdown1: snapshot1.ratingBreakdown,
      ratingBreakdown2: snapshot2.ratingBreakdown,
    };

    try {
      this.logger.info(
        `[Club ${clubId}] Sending snapshots to AI provider for analysis`,
      );
      const inMatchData = await this.inMatchProvider.getInMatchAnalysis(body);

      if (!inMatchData) {
        this.logger.error(`[Club ${clubId}] AI provider returned empty result`);
        throw new NotFoundException('Failed to fetch data from external API');
      }

      this.logger.info(`[Club ${clubId}] AI analysis received successfully`);
      return inMatchData;
    } catch (error) {
      this.logger.error(
        `[Club ${clubId}] Failed to fetch in-match analysis`,
        error instanceof Error ? error.message : String(error),
      );
      throw new InternalServerErrorException(
        'Failed to persist in-match analysis',
      );
    } finally {
      this.isAiProcessing = false;
      this.logger.info(`[Club ${clubId}] isAiProcessing reset to false`);
    }
  }

  /**
   * Collects a point-in-time snapshot of match data for both teams.
   *
   * Fetches statistics, lineups, incidents, and shot map in parallel,
   * then resolves active players (accounting for substitutions) and
   * fetches per-player heatmaps and rating breakdowns.
   *
   * @param eventId - The SofaScore event ID for the current match.
   * @param teamId - The SofaScore ID of the target team.
   * @param opponentId - The SofaScore ID of the opposing team.
   * @returns A snapshot object containing statistics, lineups, shotmap, heatmap, and ratingBreakdown.
   */
  private async collectSnapshot(
    eventId: number,
    teamId: number,
    opponentId: number,
  ) {
    this.logger.info(
      `[Event ${eventId}] Collecting snapshot for team ${teamId} vs ${opponentId}`,
    );

    const [statistics, lineups, incidents, shotmap] = await Promise.all([
      this.sofaScore.getStatistics(eventId),
      this.sofaScore.getLineups(eventId),
      this.sofaScore.getIncidents(eventId),
      this.sofaScore.getShotMap(eventId),
    ]);

    this.logger.info(
      `[Event ${eventId}] Fetched statistics, lineups, incidents, and shotmap`,
    );

    const substitutions = incidents.incidents.filter(
      ({ incidentType }) => incidentType === 'substitution',
    );

    this.logger.info(
      `[Event ${eventId}] Found ${substitutions.length} substitution(s)`,
    );

    const matchDetails = await this.sofaScore.getMatchDetails(eventId);

    let allPlayers: any[];

    if (matchDetails.event.homeTeam.id === teamId) {
      this.logger.info(
        `[Event ${eventId}] Target team ${teamId} is the HOME team`,
      );
      allPlayers = [
        ...lineups.home.players.map((player) => ({ ...player, teamId })),
        ...lineups.away.players.map((player) => ({
          ...player,
          teamId: opponentId,
        })),
      ].filter(({ statistics }) => statistics.minutesPlayed != undefined);
    } else {
      this.logger.info(
        `[Event ${eventId}] Target team ${teamId} is the AWAY team`,
      );
      allPlayers = [
        ...lineups.home.players.map((player) => ({
          ...player,
          teamId: opponentId,
        })),
        ...lineups.away.players.map((player) => ({
          ...player,
          teamId,
        })),
      ].filter(({ statistics }) => statistics.minutesPlayed != undefined);
    }

    const inPlayers = substitutions.map(({ playerIn, playerOut }) => ({
      player: playerIn,
      teamId: allPlayers.find(({ player }) => player.id === playerOut.id)
        ?.teamId,
    }));

    const allActivePlayers = [
      ...allPlayers.filter(({ player }) =>
        substitutions.every(({ playerOut }) => playerOut.id !== player.id),
      ),
      ...inPlayers,
    ];

    this.logger.info(
      `[Event ${eventId}] Active players count: ${allActivePlayers.length}`,
    );
    const [heatmap, ratingBreakdown] = await Promise.all([
      this.getPlayerHeatmap(eventId, allActivePlayers, teamId),
      this.getPlayerRatingBreakdown(eventId, allActivePlayers, teamId),
    ]);

    this.logger.info(`[Event ${eventId}] Snapshot collection complete`);

    return {
      statistics: statistics.statistics,
      lineups,
      shotmap: shotmap.shotmap,
      heatmap,
      ratingBreakdown,
    };
  }

  /**
   * Fetches heatmap data for all active players in a match and groups them by team.
   *
   * Players for whom no heatmap data is available are silently skipped.
   *
   * @param eventId - The SofaScore event ID.
   * @param players - Array of active player objects, each with `player.id` and `teamId`.
   * @param homeTeamId - The SofaScore ID used to distinguish home vs. away players.
   * @returns An object with `home` and `away` arrays of player heatmap entries.
   */
  private async getPlayerHeatmap(
    eventId: number,
    players: any[],
    homeTeamId: number,
  ) {
    this.logger.info(
      `[Event ${eventId}] Fetching heatmaps for ${players.length} player(s)`,
    );
    const results = await Promise.all(
      players.map(async ({ player, teamId }) => {
        const heatmap = await this.sofaScore.getPlayerHeatMap(
          eventId,
          player.id,
        );
        if (!heatmap) {
          this.logger.warn(
            `[Event ${eventId}] No heatmap found for player ${player.id}`,
          );
          return null;
        }

        return {
          playerId: player.id,
          teamId,
          heatmap: heatmap.heatmap,
        };
      }),
    );

    const valid = results.filter(Boolean);
    this.logger.info(
      `[Event ${eventId}] Heatmaps collected: ${valid.length}/${players.length}`,
    );

    return {
      home: valid.filter((r) => r!.teamId === homeTeamId),
      away: valid.filter((r) => r!.teamId !== homeTeamId),
    };
  }

  /**
   * Fetches rating breakdown data for all active players in a match and groups them by team.
   *
   * Players for whom no rating breakdown is available are silently skipped.
   *
   * @param eventId - The SofaScore event ID.
   * @param players - Array of active player objects, each with `player.id` and `teamId`.
   * @param homeTeamId - The SofaScore ID used to distinguish home vs. away players.
   * @returns An object with `home` and `away` arrays of player rating breakdown entries.
   */
  private async getPlayerRatingBreakdown(
    eventId: number,
    players: any[],
    homeTeamId: number,
  ) {
    this.logger.info(
      `[Event ${eventId}] Fetching rating breakdowns for ${players.length} player(s)`,
    );
    const results = await Promise.all(
      players.map(async ({ player, teamId }) => {
        const ratingBreakdown = await this.sofaScore.getPlayerRatingBreakdown(
          eventId,
          player.id,
        );
        if (!ratingBreakdown) {
          this.logger.warn(
            `[Event ${eventId}] No rating breakdown found for player ${player.id}`,
          );
          return null;
        }

        return {
          playerId: player.id,
          teamId,
          ratingBreakdown,
        };
      }),
    );

    const valid = results.filter(Boolean);
    this.logger.info(
      `[Event ${eventId}] Rating breakdowns collected: ${valid.length}/${players.length}`,
    );
    return {
      home: valid.filter((r) => r!.teamId === homeTeamId),
      away: valid.filter((r) => r!.teamId !== homeTeamId),
    };
  }
}
