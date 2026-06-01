import {
  Controller,
  Get,
  Patch,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiOkResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { PromoteUserDto } from './dtos/promote-user.dto';
import { UpdateUserStatusDto } from './dtos/update-user-status.dto';
import {
  UserSearchQueryDto,
  UserSearchResultDto,
} from '../user/dto/user-search.dto';
import { ClaimSearchQueryDto } from './dtos/claim-search-query.dto';
import { RequireSystemRole } from '../../common/decorators/roles.decorator';
import { SystemRole } from '../../common/enums/system-role.enum';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AccessTokenPayload } from '../auth/constants/token-payload.type';

/**
 * Administrative controller for system-wide management and oversight.
 * Access is restricted to users with ADMIN or SUPER_ADMIN system roles.
 */
@ApiTags('Admin')
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
   * Updates a user's account status (e.g., Ban or Activate).
   *
   * @param id - UUID of the target user.
   * @param dto - The new status for the user.
   */
  @Patch('users/:id/status')
  @ApiOperation({
    summary: 'Update user account status (Ban/Activate/Deactivate)',
  })
  @ApiResponse({
    status: 200,
    description: 'User status updated successfully.',
  })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async updateUserStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserStatusDto,
  ): Promise<void> {
    return this.adminService.updateUserStatus(id, dto);
  }

  /**
   * Searches for users with filters and pagination.
   *
   * @param query - Search parameters.
   */
  @Get('users')
  @ApiOperation({ summary: 'Search and filter users' })
  @ApiOkResponse({
    description: 'List of users returned successfully.',
    type: UserSearchResultDto,
  })
  async searchUsers(@Query() query: UserSearchQueryDto) {
    return this.adminService.searchUsers(query);
  }

  /**
   * Searches for club ownership claims.
   *
   * @param query - Search parameters.
   */
  @Get('claims')
  @ApiOperation({ summary: 'Search and filter club ownership claims' })
  @ApiOkResponse({
    description: 'List of claims returned successfully.',
    // type: ClaimSearchResultDto, // Note: Need to create this if it doesn't exist or use a generic one
  })
  async searchClaims(@Query() query: ClaimSearchQueryDto) {
    return this.adminService.searchClaims(query);
  }

  /**
   * Searches for clubs (Teams).
   *
   * @param page - Page number.
   * @param limit - Limit per page.
   * @param name - Optional name filter.
   */
  @Get('clubs')
  @ApiOperation({ summary: 'Search and filter clubs' })
  @ApiOkResponse({
    description: 'List of clubs returned successfully.',
  })
  async searchClubs(@Body() dto: ClaimSearchQueryDto) {
    return this.adminService.searchClubs(dto);
  }
}
