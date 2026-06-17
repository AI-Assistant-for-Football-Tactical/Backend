import {
  Controller,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
  Query,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiOkResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { UserService } from './user.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserProfileResDto } from './dto/user-profile-res.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AccessTokenPayload } from '../auth/constants/token-payload.type';
import { ValidationGuard } from '../../common/guards/validation.guard';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';
import { plainToInstance } from 'class-transformer';
import { UserSearchQueryDto, UserSearchResultDto } from './dto/user-search.dto';
import { UserPublicProfileResDto } from './dto/user-public-profile.dto';
import { SystemRole } from 'src/common/enums/system-role.enum';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiOkResponse({
    description: 'Current user profile retrieved successfully',
    type: UserProfileResDto,
  })
  async getMyProfile(
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<UserProfileResDto> {
    const userProfile = await this.userService.getProfile(user.id);
    return plainToInstance(UserProfileResDto, userProfile, {
      excludeExtraneousValues: true,
    });
  }

  @Patch('me')
  @UseGuards(ValidationGuard(UpdateUserDto))
  @ApiOperation({
    summary: 'Update current user profile - return updated fields only',
  })
  @ApiOkResponse({ type: UserProfileResDto })
  @ResponseMessage('Profile updated successfully')
  async updateMyProfile(
    @CurrentUser() user: AccessTokenPayload,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<Partial<UpdateUserDto>> {
    return this.userService.updateProfile(user.id, updateUserDto);
  }

  @Delete('me')
  @ApiOperation({ summary: 'Soft delete your account and favorites' })
  @ApiOkResponse({ description: 'Account and favorites soft deleted' })
  @ResponseMessage('Account and favorites deleted')
  async softDeleteAccount(
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<void> {
    await this.userService.softDeleteAccount(user.id);
  }

  /**
   * Searches for users with filters and pagination.
   *
   * @param query - Search parameters.
   */
  @Get('')
  @ApiOperation({
    summary:
      'Search and filter users - only public profile info is returned (admin accounts are not returned)',
  })
  @ApiOkResponse({
    description: 'List of users returned successfully.',
    type: UserSearchResultDto,
  })
  async searchUsers(
    @Query() dto: UserSearchQueryDto,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<UserSearchResultDto> {
    if (user.sys_role === SystemRole.USER) {
      if (dto.system_role === undefined) {
        dto.system_role = SystemRole.USER;
      }
      if (dto.system_role !== SystemRole.USER) {
        throw new ForbiddenException('You are not authorized to get this user');
      }
    }
    return this.userService.searchUsers(dto);
  }

  /**
   * Get user by ID
   *
   * @param id - User ID
   */
  @Get(':id')
  @ApiOperation({
    summary:
      'Get user by Id only public info is returned (admin accounts are not returned)',
  })
  @ApiNotFoundResponse({ description: 'Invalid user ID' })
  @ApiOkResponse({ type: UserPublicProfileResDto })
  async getUserById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<UserPublicProfileResDto> {
    return this.userService.findOneByIdOrFail(id, user);
  }

  /* TODO: Implement later */

  // @Patch('me/deactivate')
  // @ApiOperation({ summary: 'Deactivate your account' })
  // @ApiOkResponse({ description: 'Account deactivated' })
  // @ResponseMessage('Account deactivated')
  // async deactivateAccount(
  //   @CurrentUser() user: AccessTokenPayload,
  // ): Promise<void> {
  //   await this.userService.deactivateAccount(user.id);
  // }

  // @Patch('me/activate')
  // @ApiOperation({ summary: 'Activate your deactivated account' })
  // @ApiOkResponse({ description: 'Account activated' })
  // @ResponseMessage('Account activated')
  // async activateAccount(
  //   @CurrentUser() user: AccessTokenPayload,
  // ): Promise<UserProfileResDto> {
  // userProfile = await this.userService.activateAccount(user.id);
  //   return plainToInstance(UserProfileResDto, userProfile, {
  //     excludeExtraneousValues: true,
  //   });
  // }
}
