import { plainToInstance } from 'class-transformer';
import { PreMatchResDto } from '../dto/prematch-dto';
import { PreMatchAnalysisEntity } from '../entities/pre-match-analysis.entity';

export class PreMatchMapper {
  static toEntity(dto: PreMatchResDto): PreMatchAnalysisEntity {
    const entity = new PreMatchAnalysisEntity();

    entity.sofa_score_team_id = dto.meta.teamId;
    entity.opponentId = dto.meta.opponentId;
    entity.matchDate = new Date(dto.meta.matchDate);
    entity.analysisTimestamp = new Date(dto.meta.analysisTimestamp);

    entity.trainingPlan = JSON.parse(JSON.stringify(dto.trainingPlan));
    entity.teamSelection = JSON.parse(JSON.stringify(dto.teamSelection));
    entity.opponentAnalysis = JSON.parse(JSON.stringify(dto.opponentAnalysis));

    return entity;
  }

  static toDto(entity: PreMatchAnalysisEntity): PreMatchResDto {
    return plainToInstance(PreMatchResDto, {
      meta: {
        teamId: entity.sofa_score_team_id,
        opponentId: entity.opponentId,
        matchDate: entity.matchDate,
        analysisTimestamp: entity.analysisTimestamp,
      },
      trainingPlan: entity.trainingPlan,
      teamSelection: entity.teamSelection,
      opponentAnalysis: entity.opponentAnalysis,
    });
  }
}
