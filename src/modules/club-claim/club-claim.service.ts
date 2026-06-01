import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { DataSource, FindOptionsWhere } from 'typeorm';
import { ClaimRepository } from './repositories/claim.repository';
import { UserRepository } from '../user/repositories/user.repository';
import { SubmitClaimDto } from './dto/submit-claim.dto';
import { ReviewClaimDto } from './dto/review-claim.dto';
import { ClaimReviewAction } from './enums/claim-review-action.enum';
import { ClaimSearchQueryDto } from './dto/claim-search-query.dto';
import { ClaimStatus } from '../../common/enums/claim-status.enum';
import { Claim } from './entities/claim.entity';
import { Club } from '../club/entities/club.entity';
import { User } from '../user/entities/user.entity';
import { Invitation } from '../invitation/entities/invitation.entity';
import { InvitationStatus } from '../invitation/constants/invitation-status.enum';
import { ClubStatus } from '../club/constants/club-status.enum';
import { TeamRole } from '../../common/enums/team-role.enum';
import {
  ClaimStatusResponseDto,
  AdminClaimDetailResponseDto,
  PaginatedClaimsResponseDto,
} from './dto/claim-response.dto';
import type { AccessTokenPayload } from '../auth/constants/token-payload.type';

@Injectable()
export class ClubClaimService {
  constructor(
    private readonly claimRepository: ClaimRepository,
    private readonly userRepository: UserRepository,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Submit a new club ownership claim.
   *
   * @param user - The authenticated user submitting the claim.
   * @param dto  - The submission payload with SofaScore ID, justification, and document URLs.
   * @returns    - Promise resolving to the status of the submitted claim.
   * @throws     - NotFoundException if the user does not exist.
   * @throws     - BadRequestException if the user account is banned.
   * @throws     - ConflictException if user has an active claim, already has a club, or target club is registered.
   */
  async submitClaim(
    user: AccessTokenPayload,
    dto: SubmitClaimDto,
  ): Promise<ClaimStatusResponseDto> {
    // 1. Validate that the claimant user exists in our system, is ACTIVE, and is verified
    const claimant = await this.userRepository.findActiveById(user.id);

    if (!claimant) {
      throw new NotFoundException('Claimant user not found or is inactive.');
    }

    if (!claimant.is_verified) {
      throw new BadRequestException(
        'Your account is not verified. Please complete the verification process.',
      );
    }

    // Check if user already belongs to a club
    if (claimant.club_id) {
      throw new ConflictException('You already belong to a club.');
    }

    // 2. Check if the user already has an active (non-terminal) claim
    const activeUserClaim = await this.claimRepository.internalRepo.findOne({
      where: {
        user_id: user.id,
        status: ClaimStatus.PENDING,
      },
    });

    if (activeUserClaim) {
      throw new ConflictException(
        'You already have a pending or under-review claim. Please cancel it or wait for review.',
      );
    }

    // 3. Check if the target club already exists in our system
    const existingClub = await this.dataSource.getRepository(Club).findOne({
      where: { sofa_score_club_id: dto.external_club_id },
    });

    if (existingClub) {
      throw new ConflictException(
        'This club is already registered and owned in our system.',
      );
    }

    // 4. Create and save the new claim
    const newClaim = this.claimRepository.internalRepo.create({
      user_id: user.id,
      sofa_score_team_id: dto.external_club_id,
      club_name: dto.club_name || `Club ${dto.external_club_id}`,
      justification: dto.justification || null,
      document_urls: dto.document_urls,
      status: ClaimStatus.PENDING,
    });

    const savedClaim = await this.claimRepository.internalRepo.save(newClaim);

    return ClaimStatusResponseDto.fromEntity(savedClaim);
  }

  /**
   * Retrieves the current user's latest claim.
   */
  async getMyRecentClaim(
    user: AccessTokenPayload,
  ): Promise<ClaimStatusResponseDto> {
    const claim = await this.claimRepository.getRecentClaim(user.id);

    if (!claim) {
      throw new NotFoundException('No claim found for this user.');
    }

    return ClaimStatusResponseDto.fromEntity(claim);
  }

  /**
   * Cancels the user's latest PENDING claim.
   */
  async cancelMyRecentClaim(user: AccessTokenPayload): Promise<void> {
    const claim = await this.claimRepository.getRecentClaim(user.id);

    if (!claim) {
      throw new NotFoundException('No claim found for this user.');
    }

    if (claim.status !== ClaimStatus.PENDING) {
      throw new BadRequestException(
        `Claim is in a terminal state (${claim.status}) and cannot be cancelled.`,
      );
    }

    claim.status = ClaimStatus.REVOKED;
    await this.claimRepository.internalRepo.save(claim);
  }

  /**
   * Returns a paginated list of all claims, optionally filtered by status or reviewer.
   *
   * @param query - The claim search query parameters (status, reviewer_id, page, limit).
   * @returns    - Promise resolving to paginated claim search results.
   */
  async listClaims(
    query: ClaimSearchQueryDto,
  ): Promise<PaginatedClaimsResponseDto> {
    const { status, reviewer_id, page, limit } = query;
    const skip = (page - 1) * limit;

    const where: FindOptionsWhere<Claim> = {};
    if (status) {
      where.status = status;
    }
    if (reviewer_id) {
      where.reviewer_id = reviewer_id;
    }

    const [claims, total] =
      await this.claimRepository.internalRepo.findAndCount({
        where,
        skip,
        take: limit,
        order: { created_at: 'DESC' },
      });

    const mappedClaims = claims.map((claim) =>
      AdminClaimDetailResponseDto.fromEntity(claim),
    );

    return {
      claims: mappedClaims,
      total,
      page,
      limit,
    };
  }

  /**
   * Retrieves full details of a specific claim.
   */
  async getClaimDetail(id: string): Promise<AdminClaimDetailResponseDto> {
    const claim = await this.claimRepository.findById(id, {
      user: true,
      club: true,
    });

    if (!claim) {
      throw new NotFoundException('Claim not found.');
    }

    return AdminClaimDetailResponseDto.fromEntity(claim);
  }

  /**
   * Reviews a claim (Approve or Reject).
   * APPROVE wraps club creation, user elevation, and invitation revocation in a single transaction.
   */
  async reviewClaim(
    reviewer: AccessTokenPayload,
    claimId: string,
    dto: ReviewClaimDto,
  ): Promise<void> {
    const claim = await this.claimRepository.findById(claimId, {
      user: true,
    });

    if (!claim) {
      throw new NotFoundException('Claim not found.');
    }

    if (claim.status !== ClaimStatus.PENDING) {
      throw new BadRequestException('Claim is not in a reviewable state.');
    }

    const claimant = claim.user;
    if (!claimant) {
      throw new NotFoundException('Claimant user not found.');
    }

    if (dto.action === ClaimReviewAction.APPROVE) {
      // Check if claimant already belongs to a club
      if (claimant.club_id) {
        throw new ConflictException('Claimant already belongs to a club.');
      }

      // Execute ACID Transaction
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        // 1. Create and Save the Club
        const newClub = queryRunner.manager.create(Club, {
          name: claim.club_name,
          sofa_score_club_id: claim.sofa_score_team_id,
          creator_id: claimant.id,
          owner_id: claimant.id,
          status: ClubStatus.ACTIVE,
          logo_url: claim.document_urls[0] || null,
        });
        const savedClub = await queryRunner.manager.save(Club, newClub);

        // 2. Elevate Claimant to OWNER and assign club
        claimant.club_id = savedClub.id;
        claimant.member_role = TeamRole.OWNER;
        await queryRunner.manager.save(User, claimant);

        // 3. Mark Claim as APPROVED
        claim.status = ClaimStatus.APPROVED;
        claim.club_id = savedClub.id;
        claim.reviewer_id = reviewer.id;
        claim.reviewed_at = new Date();
        await queryRunner.manager.save(Claim, claim);

        // 4. Revoke all pending invitations for this user
        await queryRunner.manager.update(
          Invitation,
          { to_user_id: claimant.id, status: InvitationStatus.PENDING },
          { status: InvitationStatus.REVOKED, status_changed_at: new Date() },
        );

        await queryRunner.commitTransaction();
      } catch (error) {
        await queryRunner.rollbackTransaction();
        throw error;
      } finally {
        await queryRunner.release();
      }
    } else {
      // REJECT: Mark Claim as REJECTED and set reason
      claim.status = ClaimStatus.REJECTED;
      claim.reviewer_id = reviewer.id;
      claim.reviewed_at = new Date();
      claim.rejection_reason =
        dto.feedback || 'Claim rejected by administrator.';
      await this.claimRepository.internalRepo.save(claim);
    }
  }
}
