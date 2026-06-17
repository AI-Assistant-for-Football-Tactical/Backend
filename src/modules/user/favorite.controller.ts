import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiConflictResponse,
} from '@nestjs/swagger';
import { FavoriteService } from './favorite.service';
import { CreateFavoriteDto } from './dto/create-favorite.dto';
import { FavoriteResDto } from './dto/favorite-res.dto';
import {
  FavoriteSearchQueryDto,
  FavoriteSearchResultDto,
} from './dto/favorite-search.dto';
import { BulkDeleteFavoritesDto } from './dto/bulk-delete-favorites.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AccessTokenPayload } from '../auth/constants/token-payload.type';
import { ValidationGuard } from '../../common/guards/validation.guard';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';

@ApiTags('favorites')
@ApiBearerAuth()
@Controller('favorites')
export class FavoriteController {
  constructor(private readonly favoriteService: FavoriteService) {}

  /**
   * Retrieves the current user's favorites with optional target type/name filters and pagination.
   *
   * @param user The authenticated user's access token payload.
   * @param query The filter and pagination parameters.
   * @returns A promise that resolves to a paginated search result of favorites.
   */
  @Get()
  @ApiOperation({
    summary: 'Get current user favorites with filters and pagination',
  })
  @ApiOkResponse({
    description: 'User favorites successfully retrieved.',
    type: FavoriteSearchResultDto,
  })
  async getMyFavorites(
    @CurrentUser() user: AccessTokenPayload,
    @Query() query: FavoriteSearchQueryDto,
  ): Promise<FavoriteSearchResultDto> {
    return this.favoriteService.findAllByUser(user.id, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a favorite by ID' })
  @ApiOkResponse({
    description: 'Favorite successfully retrieved.',
    type: FavoriteResDto,
  })
  @ApiNotFoundResponse({
    description: 'Favorite not found or does not belong to the user',
  })
  async getFavorite(
    @CurrentUser() user: AccessTokenPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<FavoriteResDto> {
    return this.favoriteService.findOne(user.id, id);
  }

  @Post()
  @UseGuards(ValidationGuard(CreateFavoriteDto))
  @ApiOperation({ summary: 'Add a favorite' })
  @ApiCreatedResponse({ type: FavoriteResDto })
  @ApiConflictResponse({ description: 'Already in favorites' })
  @ResponseMessage('Added to favorites')
  async addFavorite(
    @CurrentUser() user: AccessTokenPayload,
    @Body() createFavoriteDto: CreateFavoriteDto,
  ) {
    return this.favoriteService.create(user.id, createFavoriteDto);
  }

  @Delete('bulk')
  @UseGuards(ValidationGuard(BulkDeleteFavoritesDto))
  @ApiOperation({
    summary: 'Bulk remove favorites (maximum 20) - remove all or nothing',
  })
  @ApiNotFoundResponse({
    description: 'One or more favorites not found or do not belong to the user',
  })
  @ResponseMessage('Removed favorites in bulk')
  async removeFavoritesBulk(
    @CurrentUser() user: AccessTokenPayload,
    @Body() dto: BulkDeleteFavoritesDto,
  ): Promise<void> {
    await this.favoriteService.removeBulk(user.id, dto.ids);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove a favorite' })
  @ApiNotFoundResponse({ description: 'Favorite not found' })
  @ResponseMessage('Removed from favorites')
  async removeFavorite(
    @CurrentUser() user: AccessTokenPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.favoriteService.remove(user.id, id);
    return null;
  }
}
