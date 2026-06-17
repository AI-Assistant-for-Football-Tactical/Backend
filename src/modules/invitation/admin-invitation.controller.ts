import { Controller, Get, Query, HttpCode, HttpStatus } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiOkResponse,
} from '@nestjs/swagger';
import { InvitationService } from './invitation.service';
import { InvitationSearchQueryDto } from './dto/invitation-search-query.dto';
import { PaginatedAdminInvitationsResponseDto } from './dto/invitation-response.dto';
import { RequireSystemRole } from '../../common/decorators/roles.decorator';
import { SystemRole } from '../../common/enums/system-role.enum';

/**
 * Controller handling system administrator actions for invitations.
 * Routes are restricted to platform administrators only.
 */
@ApiTags('Admin / Invitations')
@ApiBearerAuth()
@Controller('admin/invites')
export class AdminInvitationsController {
  /**
   * Constructs the AdminInvitationsController.
   *
   * @param invitationService Business logic service for invitations
   */
  constructor(private readonly invitationService: InvitationService) {}

  /**
   * Search for all invitations in the system with pagination and filters.
   *
   * @param query Search filters and pagination limits
   * @returns Paginated list of invitations
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  @RequireSystemRole(SystemRole.ADMIN)
  @ApiOperation({
    summary: 'Paginated search for all invitations (Admin only)',
  })
  @ApiOkResponse({
    description: 'Invitations retrieved successfully.',
    type: PaginatedAdminInvitationsResponseDto,
  })
  async listAllInvitesForAdmin(
    @Query() query: InvitationSearchQueryDto,
  ): Promise<PaginatedAdminInvitationsResponseDto> {
    return this.invitationService.listAllInvitesForAdmin(query);
  }
}
