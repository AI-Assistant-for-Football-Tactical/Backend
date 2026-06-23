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

  async getMatchDetails(eventId: number) {
    this.logger.info(`Requesting match details for event=${eventId}`);

    try {
      const { data } = await this.httpClient.get(`/events/${eventId}`);

      if (!data) {
        this.logger.warn(`match details not found for event=${eventId}`);
        throw new NotFoundException('not found match details');
      }

      this.logger.info(`match details resolved: ${eventId}`);
      return data;
    } catch (error: unknown) {
      this.logger.error(
        `Failed to fetch match details for event=${eventId}`,
        error instanceof Error ? error.stack : String(error),
      );

      throw new Error(`Failed to fetch match details`);
    }
  }

  async getEventId(teamId: number) {
    this.logger.info(`Requesting event id for team=${teamId}`);

    try {
      const { data } = await this.httpClient.get(
        `/teams/${teamId}/events/last/0`,
      );

      const eventId = data?.events?.[data.events.length - 1]?.id;

      if (!eventId) {
        this.logger.warn(
          `Event id not found for team=${teamId} (invalid API response)`,
        );
        return null;
      }

      this.logger.info(`Event id resolved: ${eventId}`);
      return eventId;
    } catch (error: unknown) {
      this.logger.error(
        `Failed to fetch event id for team=${teamId}`,
        error instanceof Error ? error.stack : String(error),
      );

      return null;
    }
  }

  async getStatistics(eventId: number) {
    this.logger.info(`Requesting statistics for event=${eventId}`);

    try {
      const { data: statistics } = await this.httpClient.get(
        `/events/${eventId}/statistics`,
      );

      if (!statistics) {
        this.logger.warn(
          `Statistics not found for event=${eventId} (invalid API response)`,
        );
        return null;
      }

      this.logger.info(`Statistics resolved for event=${eventId}`);
      return statistics;
    } catch (error: unknown) {
      this.logger.error(
        `Failed to fetch statistics for event=${eventId}`,
        error instanceof Error ? error.stack : String(error),
      );

      return null;
    }
  }

  async getLineups(eventId: number) {
    this.logger.info(`Requesting lineups for event=${eventId}`);

    try {
      const { data: lineups } = await this.httpClient.get(
        `/events/${eventId}/lineups`,
      );

      if (!lineups) {
        this.logger.warn(
          `lineups not found for event=${eventId} (invalid API response)`,
        );
        return null;
      }

      this.logger.info(`lineups resolved for event=${eventId}`);
      return lineups;
    } catch (error: unknown) {
      this.logger.error(
        `Failed to fetch lineups for event=${eventId}`,
        error instanceof Error ? error.stack : String(error),
      );

      return null;
    }
  }

  async getIncidents(eventId: number) {
    this.logger.info(`Requesting incidents for event=${eventId}`);

    try {
      const { data: incidents } = await this.httpClient.get(
        `/events/${eventId}/incidents`,
      );

      if (!incidents) {
        this.logger.warn(
          `incidents not found for event=${eventId} (invalid API response)`,
        );
        return null;
      }

      this.logger.info(`incidents resolved for event=${eventId}`);
      return incidents;
    } catch (error: unknown) {
      this.logger.error(
        `Failed to fetch incidents for event=${eventId}`,
        error instanceof Error ? error.stack : String(error),
      );

      return null;
    }
  }

  async getShotMap(eventId: number) {
    this.logger.info(`Requesting shot map for event=${eventId}`);

    try {
      const { data: shotmap } = await this.httpClient.get(
        `/events/${eventId}/shotmap`,
      );

      if (!shotmap) {
        this.logger.warn(
          `shotmap not found for event=${eventId} (invalid API response)`,
        );
        return null;
      }

      this.logger.info(`shotmap resolved for event=${eventId}`);
      return shotmap;
    } catch (error: unknown) {
      this.logger.error(
        `Failed to fetch shotmap for event=${eventId}`,
        error instanceof Error ? error.stack : String(error),
      );

      return null;
    }
  }

  async getPlayerHeatMap(eventId: number, playerId: number) {
    this.logger.info(
      `Requesting heat map for player=${playerId} and event=${eventId}`,
    );

    try {
      const { data: heatmap } = await this.httpClient.get(
        `/events/${eventId}/player/${playerId}/heatmap`,
      );

      if (!heatmap) {
        this.logger.warn(
          `heatmap not found for player=${playerId} and event=${eventId} (invalid API response)`,
        );
        return null;
      }

      this.logger.info(
        `heatmap resolved for player=${playerId} and event=${eventId}`,
      );
      return heatmap;
    } catch (error: unknown) {
      this.logger.error(
        `Failed to fetch heatmap for event=${eventId}`,
        error instanceof Error ? error.stack : String(error),
      );

      return null;
    }
  }

  async getPlayerRatingBreakdown(eventId: number, playerId: number) {
    this.logger.info(
      `Requesting rating-breakdown for player=${playerId} and event=${eventId}`,
    );

    try {
      const { data: ratingBreakdown } = await this.httpClient.get(
        `/events/${eventId}/player/${playerId}/rating-breakdown`,
      );

      if (!ratingBreakdown) {
        this.logger.warn(
          `rating-breakdown not found for player=${playerId} and event=${eventId} (invalid API response)`,
        );
        return null;
      }

      this.logger.info(
        `rating-breakdown resolved for player=${playerId} and event=${eventId}`,
      );
      return ratingBreakdown;
    } catch (error: unknown) {
      this.logger.error(
        `Failed to fetch rating-breakdown for event=${eventId}`,
        error instanceof Error ? error.stack : String(error),
      );

      return null;
    }
  }

  async isMatchFinished(eventId: number) {
    this.logger.info(`Requesting status info for event=${eventId}`);

    try {
      const { data } = await this.httpClient.get(`/events/${eventId}`);

      if (!data) {
        this.logger.warn(
          `match status not found for event=${eventId} (invalid API response)`,
        );
        return null;
      }

      this.logger.info(`match status resolved for event=${eventId}`);
      if (data.event.status.type === 'finished') {
        return true;
      } else {
        return false;
      }
    } catch (error: unknown) {
      this.logger.error(
        `Failed to fetch match status for event=${eventId}`,
        error instanceof Error ? error.stack : String(error),
      );

      return null;
    }
  }
}
