import {
  Controller,
  Get,
  Patch,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiOkResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { RequireSystemRole } from '../../../common/decorators/roles.decorator';
import { SystemRole } from '../../../common/enums/system-role.enum';
import { UpdateClubStatusDto } from '../dto/update-club-status.dto';
import { ClubSearchQueryDto } from '../dto/club-search-query.dto';
import {
  PaginatedClubMembersResponseDto,
  PaginatedClubsResponseDto,
} from '../dto/club-governance.dto';
import { ClubMemberSearchQueryDto } from '../dto/club-member-search-query.dto';
import { ClubService } from '../club.service';

/**
 * Admin controller for club management.
 * All routes require ADMIN or SUPER_ADMIN system role.
 */
@ApiTags('Admin — Clubs')
@ApiBearerAuth()
@Controller('admin/clubs')
@RequireSystemRole(SystemRole.ADMIN, SystemRole.SUPER_ADMIN)
export class AdminClubController {
  constructor(private readonly clubService: ClubService) {}

  /**
   * Paginated list of all internal clubs.
   *
   * @param query - Pagination and optional name filter
   * @returns Paginated clubs
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Paginated list of all internal clubs' })
  @ApiOkResponse({ type: PaginatedClubsResponseDto })
  async listClubs(
    @Query() query: ClubSearchQueryDto,
  ): Promise<PaginatedClubsResponseDto> {
    return this.clubService.listClubs(query);
  }

  /**
   * List active members of a club.
   *
   * @param id - UUID of the club
   * @returns Active club members
   */
  @Get(':id/members')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List active members of a club' })
  @ApiOkResponse({ type: PaginatedClubMembersResponseDto })
  @ApiNotFoundResponse({ description: 'Club not found.' })
  async listClubMembers(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: ClubMemberSearchQueryDto,
  ): Promise<PaginatedClubMembersResponseDto> {
    return this.clubService.listClubMembersForAdmin(id, query);
  }

  /**
   * Update a club's status and invalidate all active member sessions.
   *
   * @param id  - UUID of the club
   * @param dto - New status payload
   */
  @Patch(':id/status')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Update a club's status and trigger member session invalidation",
  })
  @ApiNoContentResponse({ description: 'Club status updated.' })
  @ApiNotFoundResponse({ description: 'Club not found.' })
  async updateClubStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateClubStatusDto,
  ): Promise<void> {
    return this.clubService.updateClubStatus(id, dto);
  }
}
