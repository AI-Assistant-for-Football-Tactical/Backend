import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StorageFile } from './entities/storage-file.entity';
import { StorageFileRepository } from './repositories/storage-file.repository';
import { StorageService } from './storage.service';
import { StorageController } from './storage.controller';
import { UserModule } from '../user/user.module';
import { ClubModule } from '../club/club.module';
import { ClubClaimModule } from '../club-claim/club-claim.module';

/**
 * Module responsible for handling file storage operations, signature generation,
 * and database synchronization for uploaded assets.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([StorageFile]),
    UserModule,
    ClubModule,
    ClubClaimModule,
  ],
  controllers: [StorageController],
  providers: [StorageService, StorageFileRepository],
  exports: [StorageService, StorageFileRepository],
})
export class StorageModule {}
