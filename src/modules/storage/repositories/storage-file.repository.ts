import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StorageFile } from '../entities/storage-file.entity';
import { BaseRepository } from '../../../common/repositories/base.repository';

/**
 * Custom repository for StorageFile entity.
 * Inherits the standard CRUD operations and data isolation logic from BaseRepository.
 */
@Injectable()
export class StorageFileRepository extends BaseRepository<StorageFile> {
  constructor(
    @InjectRepository(StorageFile)
    protected readonly repo: Repository<StorageFile>,
  ) {
    super(repo);
  }

  /**
   * Exposes the underlying TypeORM repository.
   */
  get internalRepo(): Repository<StorageFile> {
    return this.repo;
  }

  /**
   * Saves a storage file record to the database.
   *
   * @param storageFile - The storage file entity instance or raw data
   * @returns A promise resolving to the saved StorageFile
   */
  async save(storageFile: Partial<StorageFile>): Promise<StorageFile> {
    return this.repo.save(storageFile);
  }
}
