import { Test, TestingModule } from '@nestjs/testing';
import {
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { StorageService } from '../../../src/modules/storage/storage.service';
import { StorageFileRepository } from '../../../src/modules/storage/repositories/storage-file.repository';
import { UserRepository } from '../../../src/modules/user/repositories/user.repository';
import { ClubRepository } from '../../../src/modules/club/repositories/club.repository';
import { ClaimRepository } from '../../../src/modules/club-claim/repositories/claim.repository';
import { CloudinaryConfig } from '../../../src/core/config/configrations';
import { StorageFilePurpose } from '../../../src/common/enums/storage-file-purpose.enum';
import { SystemRole } from '../../../src/common/enums/system-role.enum';
import { AccessTokenPayload } from '../../../src/modules/auth/constants/token-payload.type';
import { StorageSignatureReqDto } from '../../../src/modules/storage/dto/storage-signature-req.dto';
import { StorageConfirmReqDto } from '../../../src/modules/storage/dto/storage-confirm-req.dto';
import { User } from '../../../src/modules/user/entities/user.entity';
import { Club } from '../../../src/modules/club/entities/club.entity';
import { Claim } from '../../../src/modules/club-claim/entities/claim.entity';
import { TeamRole } from 'src/common/enums/team-role.enum';

interface MockRepository {
  internalRepo: {
    findOne: jest.Mock;
    save: jest.Mock;
  };
}

interface MockStorageFileRepository {
  save: jest.Mock;
  internalRepo: {
    create: jest.Mock;
    findOne: jest.Mock;
  };
}

describe('StorageService', () => {
  let service!: StorageService;
  let cloudinaryConfigMock!: jest.Mocked<Partial<CloudinaryConfig>>;
  let storageFileRepositoryMock!: MockStorageFileRepository;
  let userRepositoryMock!: MockRepository;
  let clubRepositoryMock!: MockRepository;
  let claimRepositoryMock!: MockRepository;

  beforeEach(async () => {
    cloudinaryConfigMock = {
      apiKey: 'mock-api-key',
      apiSecret: 'mock-api-secret',
      cloudName: 'mock-cloud-name',
      cloudinaryUrl:
        'cloudinary://mock-api-key:mock-api-secret@mock-cloud-name',
      overWrite: 'false',
    } as unknown as jest.Mocked<Partial<CloudinaryConfig>>;

    storageFileRepositoryMock = {
      save: jest.fn().mockImplementation((x: unknown) =>
        Promise.resolve({
          id: 'storage-file-uuid',
          ...(x as Record<string, unknown>),
        }),
      ),
      internalRepo: {
        create: jest.fn().mockImplementation((x: unknown) => x),
        findOne: jest.fn(),
      },
    };

    userRepositoryMock = {
      internalRepo: {
        findOne: jest.fn(),
        save: jest.fn().mockImplementation((x: unknown) => Promise.resolve(x)),
      },
    };

    clubRepositoryMock = {
      internalRepo: {
        findOne: jest.fn(),
        save: jest.fn().mockImplementation((x: unknown) => Promise.resolve(x)),
      },
    };

    claimRepositoryMock = {
      internalRepo: {
        findOne: jest.fn(),
        save: jest.fn().mockImplementation((x: unknown) => Promise.resolve(x)),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StorageService,
        { provide: CloudinaryConfig, useValue: cloudinaryConfigMock },
        { provide: StorageFileRepository, useValue: storageFileRepositoryMock },
        { provide: UserRepository, useValue: userRepositoryMock },
        { provide: ClubRepository, useValue: clubRepositoryMock },
        { provide: ClaimRepository, useValue: claimRepositoryMock },
      ],
    }).compile();

    service = module.get<StorageService>(StorageService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getSignature', () => {
    const user: AccessTokenPayload = {
      id: 'user-uuid-123',
      username: 'user123',
      status: 'ACTIVE',
      sys_role: SystemRole.USER,
      club_id: 'club-uuid-123',
      mem_role: TeamRole.NONE,
    };

    it('should generate signature and dynamic upload URL successfully (Happy Path)', async () => {
      const query: StorageSignatureReqDto = {
        purpose: StorageFilePurpose.PROFILE_IMAGE,
        entityId: 'user-uuid-123',
      };

      const result = await service.getSignature(user, query);

      expect(result).toBeDefined();
      expect(result.api_key).toBe('mock-api-key');
      expect(result.cloud_name).toBe('mock-cloud-name');
      expect(result.folder).toBe('profile-image');
      expect(result.public_id).toContain('user-uuid-123_profile_image_');
      expect(result.upload_url).toBe(
        'https://api.cloudinary.com/v1_1/mock-cloud-name/auto/upload',
      );
      expect(result.signature).toHaveLength(40);
      expect(result.overwrite).toBe('false');
    });

    it('should enforce user entity access check and throw ForbiddenException on mismatch', async () => {
      const query: StorageSignatureReqDto = {
        purpose: StorageFilePurpose.PROFILE_IMAGE,
        entityId: 'user-uuid-999',
      };

      await expect(service.getSignature(user, query)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should allow SystemRole.ADMIN to bypass entity ownership validations', async () => {
      const adminUser: AccessTokenPayload = {
        id: 'admin-uuid',
        username: 'admin',
        status: 'ACTIVE',
        sys_role: SystemRole.ADMIN,
        club_id: null,
        mem_role: TeamRole.NONE,
      };

      const query: StorageSignatureReqDto = {
        purpose: StorageFilePurpose.PROFILE_IMAGE,
        entityId: 'user-uuid-999',
      };

      const result = await service.getSignature(adminUser, query);
      expect(result).toBeDefined();
      expect(result.public_id).toContain('user-uuid-999_profile_image_');
    });
  });

  describe('confirmUpload', () => {
    const user: AccessTokenPayload = {
      id: 'user-uuid-123',
      username: 'user123',
      status: 'ACTIVE',
      sys_role: SystemRole.USER,
      club_id: 'club-uuid-123',
      mem_role: TeamRole.NONE,
    };

    it('should sync user avatar and save storage file log successfully using Strategy Pattern', async () => {
      const dbUser = {
        id: 'user-uuid-123',
        username: 'testuser',
        profile_image_url: '',
      };
      userRepositoryMock.internalRepo.findOne.mockResolvedValue(dbUser);

      const body: StorageConfirmReqDto = {
        purpose: StorageFilePurpose.PROFILE_IMAGE,
        entityId: 'user-uuid-123',
        public_id: 'mock-public-id-avatar',
        secure_url: 'https://cloudinary.com/image.jpg',
        original_name: 'avatar.jpg',
        mime_type: 'image/jpeg',
        size_bytes: 1024,
      };

      const result = await service.confirmUpload(user, body);

      expect((result.entity as User).profile_image_url).toBe(
        'https://cloudinary.com/image.jpg',
      );
      expect(userRepositoryMock.internalRepo.save).toHaveBeenCalled();
      expect(storageFileRepositoryMock.save).toHaveBeenCalledWith(
        expect.objectContaining({
          purpose: StorageFilePurpose.PROFILE_IMAGE,
          file_key: 'mock-public-id-avatar',
          public_url: 'https://cloudinary.com/image.jpg',
        }),
      );
    });

    it('should sync club logo successfully using Strategy Pattern', async () => {
      const dbClub = {
        id: 'club-uuid-123',
        name: 'FC Barcelona',
        logo_url: '',
      };
      clubRepositoryMock.internalRepo.findOne.mockResolvedValue(dbClub);

      const body: StorageConfirmReqDto = {
        purpose: StorageFilePurpose.CLUB_LOGO,
        entityId: 'club-uuid-123',
        public_id: 'mock-public-id-logo',
        secure_url: 'https://cloudinary.com/logo.jpg',
        original_name: 'logo.jpg',
        mime_type: 'image/jpeg',
        size_bytes: 2048,
      };

      const result = await service.confirmUpload(user, body);

      expect((result.entity as Club).logo_url).toBe(
        'https://cloudinary.com/logo.jpg',
      );
      expect(clubRepositoryMock.internalRepo.save).toHaveBeenCalled();
    });

    it('should sync claim document and hide public_url (sensitive data protection)', async () => {
      const dbClaim = {
        id: 'claim-uuid-123',
        user_id: 'user-uuid-123',
        document_urls: [] as string[],
      };
      claimRepositoryMock.internalRepo.findOne.mockResolvedValue(dbClaim);

      const body: StorageConfirmReqDto = {
        purpose: StorageFilePurpose.CLAIM_DOCUMENT,
        entityId: 'claim-uuid-123',
        public_id: 'mock-public-id-doc',
        secure_url: 'https://cloudinary.com/doc.pdf',
        original_name: 'doc.pdf',
        mime_type: 'application/pdf',
        size_bytes: 4096,
      };

      const result = await service.confirmUpload(user, body);

      expect((result.entity as Claim).document_urls).toContain(
        'https://cloudinary.com/doc.pdf',
      );
      expect(claimRepositoryMock.internalRepo.save).toHaveBeenCalled();

      expect(storageFileRepositoryMock.save).toHaveBeenCalledWith(
        expect.objectContaining({
          purpose: StorageFilePurpose.CLAIM_DOCUMENT,
          public_url: null,
        }),
      );
    });

    it('should skip synchronization and save file transaction log if entityId is not provided', async () => {
      const body: StorageConfirmReqDto = {
        purpose: StorageFilePurpose.CLAIM_DOCUMENT,
        public_id: 'mock-public-id-doc-no-entity',
        secure_url: 'https://cloudinary.com/doc.pdf',
        original_name: 'doc.pdf',
        mime_type: 'application/pdf',
        size_bytes: 4096,
      };

      const result = await service.confirmUpload(user, body);

      expect(result.entity).toBeNull();
      expect(storageFileRepositoryMock.save).toHaveBeenCalledWith(
        expect.objectContaining({
          purpose: StorageFilePurpose.CLAIM_DOCUMENT,
          file_key: 'mock-public-id-doc-no-entity',
          public_url: null,
        }),
      );
    });

    it('should throw NotFoundException if synchronization target is not found', async () => {
      userRepositoryMock.internalRepo.findOne.mockResolvedValue(null);

      const body: StorageConfirmReqDto = {
        purpose: StorageFilePurpose.PROFILE_IMAGE,
        entityId: 'user-uuid-123',
        public_id: 'mock-public-id-avatar',
        secure_url: 'https://cloudinary.com/image.jpg',
      };

      await expect(service.confirmUpload(user, body)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if signature has expired (older than 5 minutes)', async () => {
      const oldTimestamp = Math.round(Date.now() / 1000) - 400; // 400 seconds ago
      const body: StorageConfirmReqDto = {
        purpose: StorageFilePurpose.PROFILE_IMAGE,
        entityId: 'user-uuid-123',
        public_id: `user-uuid-123_profile_image_${oldTimestamp}`,
        secure_url: 'https://cloudinary.com/image.jpg',
      };

      await expect(service.confirmUpload(user, body)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if same upload signature is used twice', async () => {
      const currentTimestamp = Math.round(Date.now() / 1000);
      const publicId = `user-uuid-123_profile_image_${currentTimestamp}`;

      // Simulate signature already used and logged in database
      storageFileRepositoryMock.internalRepo.findOne.mockResolvedValue({
        id: 'existing-file-uuid',
        file_key: publicId,
      });

      const body: StorageConfirmReqDto = {
        purpose: StorageFilePurpose.PROFILE_IMAGE,
        entityId: 'user-uuid-123',
        public_id: publicId,
        secure_url: 'https://cloudinary.com/image.jpg',
      };

      await expect(service.confirmUpload(user, body)).rejects.toThrow(
        BadRequestException,
      );

      // Clean up mock for other tests
      storageFileRepositoryMock.internalRepo.findOne.mockResolvedValue(
        undefined,
      );
    });
  });
});
