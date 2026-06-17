import {
  Repository,
  SelectQueryBuilder,
  ObjectLiteral,
  EntityManager,
  QueryRunner,
} from 'typeorm';
import { SystemRole } from '../enums/system-role.enum';
import type { AccessTokenPayload } from '../../modules/auth/constants/token-payload.type';

/**
 * Base Repository class to encapsulate common query logic, including data isolation rules
 * and soft-delete/status filters.
 */
export abstract class BaseRepository<T extends ObjectLiteral> {
  constructor(protected readonly repo: Repository<T>) {}

  /**
   * Applies data isolation rules. Admin can see everything.
   * Other roles are restricted to their own club's data.
   */
  protected applyDataIsolation(
    qb: SelectQueryBuilder<T>,
    user: AccessTokenPayload | null,
    clubIdColumn: string = 'club_id',
  ): SelectQueryBuilder<T> {
    if (!user) return qb;

    // Admins bypass data isolation
    if (user.sys_role === SystemRole.ADMIN) {
      return qb;
    }

    // Isolated to the user's club
    if (user.club_id) {
      qb.andWhere(`${qb.alias}.${clubIdColumn} = :clubId`, {
        clubId: user.club_id,
      });
    } else {
      // If user has no club, they generally shouldn't see club-isolated data,
      // but we filter by IS NULL just in case to be safe, or we can handle it per-entity
      qb.andWhere(`${qb.alias}.${clubIdColumn} IS NULL`);
    }

    return qb;
  }

  get manager(): EntityManager {
    return this.repo.manager;
  }

  createQueryBuilder(
    alias?: string,
    queryRunner?: QueryRunner,
  ): SelectQueryBuilder<T> {
    return this.repo.createQueryBuilder(alias, queryRunner);
  }
}
