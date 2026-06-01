import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiOkResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UserService } from './user.service';
import { UpdateUserStatusByAdminDto } from './dto/update-user-status.dto';
import { UserSearchQueryDto, UserSearchResultDto } from './dto/user-search.dto';
import { RequireSystemRole } from '../../common/decorators/roles.decorator';
import { SystemRole } from '../../common/enums/system-role.enum';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AccessTokenPayload } from '../auth/constants/token-payload.type';

/**
 * Controller handling system administrator actions for users.
 * Access is restricted to users with ADMIN or SUPER_ADMIN system roles.
 */
@ApiTags('Admin / Users')
@ApiBearerAuth()
@Controller('admin/users')
@RequireSystemRole(SystemRole.ADMIN, SystemRole.SUPER_ADMIN)
export class AdminUserController {
  /**
   * Constructs the AdminUserController.
   *
   * @param userService Business logic service for users
   */
  constructor(private readonly userService: UserService) {}

  /**
   * Updates a user's account status (e.g., Ban or Activate).
   *
   * @param id - UUID of the target user.
   * @param dto - The new status for the user.
   * @returns A promise that resolves when the update is complete.
   * @throws NotFoundException if the user is not found.
   */
  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update user account status (Ban/Activate/Deactivate)',
  })
  @ApiResponse({
    status: 200,
    description: 'User status updated successfully.',
  })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async updateUserStatusByAdmin(
    @CurrentUser() requester: AccessTokenPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserStatusByAdminDto,
  ): Promise<void> {
    return this.userService.updateUserStatusByAdmin(requester, id, dto);
  }

  /**
   * Instantly revokes all active sessions for a user by setting last_security_action_at = NOW().
   *
   * @param id - UUID of the target user.
   * @param requester - The currently authenticated admin/super-admin.
   * @returns A promise that resolves when sessions are revoked.
   * @throws NotFoundException if the user does not exist.
   * @throws ForbiddenException if the requester attempts to modify a higher system role user.
   */
  @Post(':id/revoke-sessions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Instantly revoke all active sessions for a user' })
  @ApiResponse({
    status: 200,
    description: 'Sessions revoked successfully.',
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Hierarchy violation.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async revokeSessions(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() requester: AccessTokenPayload,
  ): Promise<void> {
    return this.userService.revokeSessionsByAdmin(requester, id);
  }

  /**
   * Searches for users with filters and pagination.
   *
   * @param query - Search parameters.
   * @returns Paginated list of users.
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Search and filter users' })
  @ApiOkResponse({
    description: 'List of users returned successfully.',
    type: UserSearchResultDto,
  })
  async searchUsers(
    @Query() query: UserSearchQueryDto,
  ): Promise<UserSearchResultDto> {
    return this.userService.searchUsers(query);
  }
}
