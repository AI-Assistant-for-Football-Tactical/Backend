import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ALLOWED_MEMBER_ROLES_KEY } from '../decorators/roles.decorator';
import { IS_PUBLIC_ENDPOINT_KEY } from '../decorators/public-endpoint.decorator';
import { TeamRole } from '../enums/team-role.enum';
import { ClubStatus } from '../../modules/club/constants/club-status.enum';
import { ClubRepository } from '../../modules/club/repositories/club.repository';
import { UserRepository } from '../../modules/user/repositories/user.repository';
import type { RequestWithUser } from '../interfaces/Request.interface';

/**
 * Verifies club-scoped actions against fresh database state.
 */
@Injectable()
export class ActiveClubGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly userRepository: UserRepository,
    private readonly clubRepository: ClubRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic =
      this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_ENDPOINT_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? false;

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException(
        'You do not have permission to access this resource',
      );
    }

    const dbUser = await this.userRepository.findActiveById(user.id);

    if (!dbUser) {
      throw new NotFoundException('User not found.');
    }

    const requiredTeamRoles =
      this.reflector.getAllAndOverride<TeamRole[]>(ALLOWED_MEMBER_ROLES_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];

    const requiresClubMember = requiredTeamRoles.some(
      (role) => role !== TeamRole.NONE,
    );

    if (!requiresClubMember) {
      return true;
    }

    if (
      !dbUser.club_id ||
      !requiredTeamRoles.includes(dbUser.member_role ?? TeamRole.NONE)
    ) {
      throw new ForbiddenException(
        'You do not have permission to access this club resource',
      );
    }

    const club = await this.clubRepository.findActiveById(dbUser.club_id);

    if (!club || club.status !== ClubStatus.ACTIVE) {
      throw new ForbiddenException('Club is not active.');
    }

    return true;
  }
}
