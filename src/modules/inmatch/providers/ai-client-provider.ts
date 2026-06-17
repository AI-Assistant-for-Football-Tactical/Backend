import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import axios, { AxiosInstance } from 'axios';
import { ConfigService } from '@nestjs/config';

/**
 * HTTP client for the AI service analysis.
 *
 * Reads AI_URL_SERVICE from configuration.
 */
@Injectable()
export class InMatchProvider {
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
      timeout: 600000,
    });

    this.logger.info(
      `AI in match service Provider initialized → ${this.baseUrl}`,
    );
  }

  async getInMatchAnalysis(body: any) {
    this.logger.info(`Requesting In match analysis`);

    try {
      const { data } = await this.httpClient.post('/in_match', body);

      this.logger.info(`in match analysis resolved`);

      return data;
    } catch (error: unknown) {
      this.logger.error(
        `Failed to fetch in-match analysis`,
        error instanceof Error ? error.stack : String(error),
      );

      throw new Error('Failed to fetch in-match analysis');
    }
  }
}
