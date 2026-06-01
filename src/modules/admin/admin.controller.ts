import {
  Controller,
  Patch,
  Post,
  Body,
  Param,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { PromoteUserDto } from './dtos/promote-user.dto';
import { RevokeTokensByAdminDto } from './dtos/revoke-tokens.dto';
import { RequireSystemRole } from '../../common/decorators/roles.decorator';
import { SystemRole } from '../../common/enums/system-role.enum';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AccessTokenPayload } from '../auth/constants/token-payload.type';

/**
 * Administrative controller for system-wide management and oversight.
 * Access is restricted to users with ADMIN or SUPER_ADMIN system roles.
 */
@ApiTags('Admin - system')
@ApiBearerAuth()
@Controller('admin')
@RequireSystemRole(SystemRole.ADMIN, SystemRole.SUPER_ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  /**
   * Promotes a user to a new system role.
   * Admins can only promote to REVIEWER.
   * Super Admins can promote to any role.
   *
   * @param id - UUID of the target user.
   * @param requester - The currently authenticated admin/super-admin.
   * @param dto - The new role for the user.
   */
  @Patch('users/:id/promote')
  @ApiOperation({ summary: 'Promote a user to a new system role' })
  @ApiResponse({ status: 200, description: 'User role updated successfully.' })
  @ApiResponse({ status: 403, description: 'Forbidden - Hierarchy violation.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async promoteUser(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() requester: AccessTokenPayload,
    @Body() dto: PromoteUserDto,
  ): Promise<void> {
    return this.adminService.promoteUser(requester, id, dto);
  }

  /**
   * Revokes all active refresh tokens in the system, optionally time-bounded.
   *
   * @param dto - Time slot boundaries.
   * @returns A promise that resolves when tokens are revoked.
   */
  @Post('tokens/revoke')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Revoke active refresh tokens, optionally time-bounded',
  })
  @ApiResponse({
    status: 200,
    description: 'Tokens revoked successfully.',
  })
  async revokeTokens(@Body() dto: RevokeTokensByAdminDto): Promise<void> {
    return this.adminService.revokeRefreshTokens(dto);
  }
}
