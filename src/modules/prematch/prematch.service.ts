import {
  BadGatewayException,
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PreMatchResDto } from './dto/prematch-dto';
import { PinoLogger } from 'nestjs-pino';
import { InjectRepository } from '@nestjs/typeorm';
import { PreMatchAnalysisEntity } from './entities/pre-match-analysis.entity';
import { Repository } from 'typeorm';
import { SofaScoreProvider } from './providers/sofa-score.provider';
import { PreMatchMapper } from './mapper/prematch.mapper';
import { PreMatchProvider } from './providers/ai-client-provider';
import { Club } from '../club/entities/club.entity';

@Injectable()
export class PrematchService {
  constructor(
    private readonly logger: PinoLogger,
    @InjectRepository(PreMatchAnalysisEntity)
    private readonly preMatchRepo: Repository<PreMatchAnalysisEntity>,
    @InjectRepository(Club)
    private readonly clubRepo: Repository<Club>,
    private readonly sofaScore: SofaScoreProvider,
    private readonly preMatchProvider: PreMatchProvider,
  ) {}

  private isAiProcessing = false;

  /**
   * Fetches and validates pre-match data from the external API.
   *
   * @returns {Promise<PreMatchResDto>} Validated pre-match data including meta,
   * training plan, team selection, and opponent analysis.
   * @throws {ApiErrorException} If the external API is unreachable or returns invalid data.
   */
  async preMatchData(clubId: string): Promise<PreMatchResDto> {
    const now = new Date();

    const club = await this.clubRepo.findOneBy({
      id: clubId,
    });

    if (!club) throw new NotFoundException('Not found club');

    const opponentId = await this.sofaScore.getOpponentId(
      Number(club.sofa_score_club_id),
    );

    if (!opponentId) throw new NotFoundException('No valid opponent found');

    const cached = await this.preMatchRepo.findOne({
      where: {
        clubId,
        opponentId,
        sofa_score_team_id: Number(club.sofa_score_club_id),
      },
    });

    if (cached && cached.expiresAt > now) {
      this.logger.info('Returning cached pre-match data');
      return PreMatchMapper.toDto(cached);
    }

    if (this.isAiProcessing) {
      throw new HttpException('wait 1 minute', HttpStatus.TOO_MANY_REQUESTS);
    }

    this.isAiProcessing = true;

    if (cached) {
      await this.preMatchRepo.delete({
        clubId,
        opponentId,
        sofa_score_team_id: Number(club.sofa_score_club_id),
      });
    }

    try {
      this.logger.info('Fetching pre-match data from external API...');

      const preMatchData = await this.preMatchProvider.getPreMatchAnalysis(
        Number(club.sofa_score_club_id),
        opponentId,
      );

      if (!preMatchData) {
        throw new BadGatewayException('Failed to fetch data from external API');
      }

      const entity = PreMatchMapper.toEntity(preMatchData);
      entity.clubId = clubId;
      entity.expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      const saved = await this.preMatchRepo.save(entity);
      return PreMatchMapper.toDto(saved);
    } catch (error) {
      this.logger.error(
        'Failed to save pre-match data',
        error instanceof Error ? error.message : String(error),
      );
      throw new InternalServerErrorException(
        'Failed to persist pre-match analysis',
      );
    } finally {
      this.isAiProcessing = false;
    }
  }
}
