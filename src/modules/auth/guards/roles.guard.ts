import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ALLOWED_SYSTEM_ROLES_KEY } from '../../../common/decorators/roles.decorator';
import { SystemRole } from '../../../common/enums/system-role.enum';
import { IS_PUBLIC_ENDPOINT_KEY } from '../../../common/decorators/public-endpoint.decorator';
import { ALLOWED_MEMBER_ROLES_KEY } from '../../../common/decorators/roles.decorator';
import { AccessTokenPayload } from '../constants/token-payload.type';
import { TeamRole } from '../../../common/enums/team-role.enum';
import { PinoLogger } from 'nestjs-pino';
import type { RequestWithUser } from '../../../common/interfaces/Request.interface';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly logger: PinoLogger,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic =
      this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_ENDPOINT_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? false;

    // Public Route
    if (isPublic) {
      return true;
    }

    const user: AccessTokenPayload = context
      .switchToHttp()
      .getRequest<RequestWithUser>().user;

    if (!user) {
      this.logger.warn('No user found in request');
      throw new ForbiddenException(
        'You do not have permission to access this resource',
      );
    }

    // Check System Roles
    let hasPermission: boolean = this.checkRole<SystemRole>(
      context,
      ALLOWED_SYSTEM_ROLES_KEY,
      user.sys_role,
    );

    // Check Member Roles
    hasPermission &&= this.checkRole<TeamRole>(
      context,
      ALLOWED_MEMBER_ROLES_KEY,
      user.mem_role,
    );

    if (!hasPermission) {
      this.logger.warn('No permission found in request');
      throw new ForbiddenException(
        'You do not have permission to access this resource',
      );
    }

    return true;
  }

  /**
   * Helper to check metadata against user role
   */
  private checkRole<T>(
    context: ExecutionContext,
    rolesKey: string,
    userRole: T | undefined,
  ): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<T[]>(rolesKey, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no roles are required for this key, allow access
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    return requiredRoles.some((role) => userRole === role);
  }
}
