import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import axios, { AxiosInstance } from 'axios';
import { ConfigService } from '@nestjs/config';
import { PREMATCH_CLIENT_TIMEOUT } from '../constants/prematch.constant';

/**
 * HTTP client for the AI service analysis.
 *
 * Reads AI_URL_SERVICE from configuration.
 */
@Injectable()
export class PreMatchProvider {
  private readonly httpClient: AxiosInstance;
  private readonly baseUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: PinoLogger,
  ) {
    this.baseUrl = this.configService.get('AI_SERVICE_URL')!;

    this.httpClient = axios.create({
      baseURL: this.baseUrl,
      headers: { 'Content-Type': 'application/json' },
      timeout: PREMATCH_CLIENT_TIMEOUT,
    });

    this.logger.info(
      `AI pre match service Provider initialized → ${this.baseUrl}`,
    );
  }

  async getPreMatchAnalysis(teamId: number, opponentId: number) {
    this.logger.info(
      `Requesting pre match analysis for team=${teamId} and opponent=${opponentId}`,
    );

    try {
      const { data } = await this.httpClient.post('/pre_match', {
        team_id: teamId,
        num_matches: 1,
        opponent_id: opponentId,
      });

      this.logger.info(`pre match analysis resolved`);

      return data;
    } catch (error: unknown) {
      this.logger.error(
        `Failed to fetch pre match analysis for team=${teamId} and opponent=${opponentId}`,
        error instanceof Error ? error.stack : String(error),
      );

      console.error(error);

      return null;
    }
  }
}
