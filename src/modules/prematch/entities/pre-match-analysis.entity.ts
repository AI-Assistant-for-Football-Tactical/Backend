import { Entity, PrimaryGeneratedColumn, Column, Unique } from 'typeorm';

@Entity('pre_match_analysis')
@Unique('UQ_team', ['clubId', 'sofa_score_team_id', 'opponentId'])
export class PreMatchAnalysisEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  clubId: string;

  @Column()
  sofa_score_team_id: number;

  @Column()
  opponentId: number;

  @Column({ type: 'timestamp' })
  matchDate: Date;

  @Column({ type: 'timestamp' })
  analysisTimestamp: Date;

  @Column({ type: 'jsonb' })
  trainingPlan: Record<string, any>;

  @Column({ type: 'jsonb' })
  teamSelection: Record<string, any>;

  @Column({ type: 'jsonb' })
  opponentAnalysis: Record<string, any>;

  @Column({ type: 'timestamp' })
  expiresAt: Date;
}
