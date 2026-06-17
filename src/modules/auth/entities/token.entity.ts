import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { AuthTokenType } from '../constants/auth-token-type.enum';
import { BaseEntity } from '../../../common/entities/base.entity';

@Entity({ name: 'auth_tokens' })
export class AuthToken extends BaseEntity {
  @Index()
  @Column({ type: 'varchar', length: 250, nullable: false })
  token_hash: string;

  @Column({ type: 'enum', enum: AuthTokenType, nullable: false })
  type: AuthTokenType;

  @Column({ type: 'uuid', nullable: false })
  user_id: string;

  @ManyToOne(() => User, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'timestamptz' })
  expires_at: Date;
}
