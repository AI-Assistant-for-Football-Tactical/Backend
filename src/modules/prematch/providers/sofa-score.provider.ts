import { Injectable, NotFoundException } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import axios, { AxiosInstance } from 'axios';
import { ConfigService } from '@nestjs/config';

/**
 * HTTP client for the Sofa score.
 *
 * Reads SOFA_SCORE_URL from configuration.
 */
@Injectable()
export class SofaScoreProvider {
  private readonly httpClient: AxiosInstance;
  private readonly baseUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: PinoLogger,
  ) {
    this.baseUrl = this.configService.get('SOFA_SCORE_URL')!;

    this.httpClient = axios.create({
      baseURL: this.baseUrl,
      headers: { 'Content-Type': 'application/json' },
    });

    this.logger.info(`Sofa Score Provider initialized → ${this.baseUrl}`);
  }

  /**
   * Fetches the upcoming opponent team ID for a given team.
   *
   * Sends a request to the external SofaScore API to retrieve the next scheduled event
   * for the specified team, then extracts the opponent (away team) ID.
   *
   * @param teamId - The ID of the team to fetch the opponent for.
   *
   * @returns A promise that resolves to:
   * - `number` → opponent team ID if found
   * - `null` → if no upcoming event exists, response is invalid, or request fails
   *
   * @throws Does not throw. All errors are caught internally and logged.
   *
   * @example
   * const opponentId = await client.getOpponentId('123');
   * if (opponentId) {
   *   console.log('Next opponent:', opponentId);
   * }
   */
  async getOpponentId(teamId: number): Promise<number | null> {
    this.logger.info(`Requesting opponent id for team=${teamId}`);

    try {
      const { data } = await this.httpClient.get(
        `/teams/${teamId}/events/next/0`,
      );

      const opponentId =
        teamId === data?.events?.[0]?.homeTeam?.id
          ? data?.events?.[0]?.awayTeam?.id
          : data?.events?.[0]?.homeTeam?.id;

      if (!opponentId) {
        this.logger.warn(
          `Opponent id not found for team=${teamId} (invalid API response)`,
        );
        return null;
      }

      this.logger.info(`Opponent id resolved: ${opponentId}`);
      return opponentId;
    } catch (error: unknown) {
      this.logger.error(
        `Failed to fetch opponent id for team=${teamId}`,
        error instanceof Error ? error.stack : String(error),
      );

      return null;
    }
  }
}
