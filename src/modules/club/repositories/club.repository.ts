import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Club } from '../entities/club.entity';
import { ClubStatus } from '../constants/club-status.enum';
import { BaseRepository } from '../../../common/repositories/base.repository';

@Injectable()
export class ClubRepository extends BaseRepository<Club> {
  constructor(
    @InjectRepository(Club)
    protected readonly repo: Repository<Club>,
  ) {
    super(repo);
  }

  get internalRepo(): Repository<Club> {
    return this.repo;
  }

  /**
   * Finds a club by ID, ensuring it is ACTIVE.
   */
  async findActiveById(
    id: string,
    relations: string[] = [],
  ): Promise<Club | null> {
    return this.repo.findOne({
      where: { id, status: ClubStatus.ACTIVE },
      relations,
    });
  }

  /**
   * Finds a club by ID with any of the allowed statuses.
   */
  async findByIdWithStatus(
    id: string,
    statuses: ClubStatus[],
    relations: string[] = [],
  ): Promise<Club | null> {
    return this.repo.findOne({
      where: { id, status: In(statuses) },
      relations,
    });
  }

  /**
   * Excludes SOFT_DELETED clubs.
   */
  async findNotDeletedById(
    id: string,
    relations: string[] = [],
  ): Promise<Club | null> {
    const club = await this.repo.findOne({
      where: { id },
      relations,
    });

    if (club && club.status !== ClubStatus.SOFT_DELETED) {
      return club;
    }
    return null;
  }
}
