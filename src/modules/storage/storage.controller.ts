import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiForbiddenResponse,
} from '@nestjs/swagger';
import { StorageService } from './storage.service';
import { StorageSignatureReqDto } from './dto/storage-signature-req.dto';
import { StorageSignatureResDto } from './dto/storage-signature-res.dto';
import { StorageConfirmReqDto } from './dto/storage-confirm-req.dto';
import { StorageConfirmResDto } from './dto/storage-confirm-res.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AccessTokenPayload } from '../auth/constants/token-payload.type';
import { ValidationGuard } from '../../common/guards/validation.guard';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';

/**
 * Controller handling all storage-related API endpoints.
 * All endpoints require a valid JWT bearer token (enforced globally).
 */
@ApiTags('storage')
@ApiBearerAuth()
@Controller('storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  /**
   * Generates a signed upload signature, timestamp, and semantic public_id for Cloudinary.
   * Enables secure, direct-to-cloud uploading from the client while bypassing backend bandwidth.
   *
   * @param user - The authenticated user requesting the signature
   * @param query - The request query parameters (purpose and entityId)
   * @returns The signed parameters and configuration needed by the client
   */
  @Get('signature')
  @ApiOperation({
    summary: 'Generate Cloudinary signed upload signature',
    description:
      'Creates a secure SHA-1 signature, timestamp, and a semantic public_id to authorize a direct file upload from the frontend to Cloudinary.',
  })
  @ApiOkResponse({
    description: 'Cloudinary upload signature generated successfully.',
    type: StorageSignatureResDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid input parameters or failed validation.',
  })
  @ApiForbiddenResponse({
    description: 'You are not authorized to upload for the specified entity.',
  })
  async getSignature(
    @CurrentUser() user: AccessTokenPayload,
    @Query() query: StorageSignatureReqDto,
  ): Promise<StorageSignatureResDto> {
    return this.storageService.getSignature(user, query);
  }

  /**
   * Confirms a successful Cloudinary file upload and synchronizes database records.
   * Updates the respective User avatar, Club logo, or Claim document array based on the purpose.
   *
   * @param user - The authenticated user confirming the upload
   * @param body - The confirmation payload (url, public_id, purpose, entityId, etc.)
   * @returns A status message and the synchronized database record
   */
  @Post('confirm')
  @UseGuards(ValidationGuard(StorageConfirmReqDto))
  @ApiOperation({
    summary: 'Confirm and synchronize Cloudinary file upload',
    description:
      'Processes a successful Cloudinary direct upload, logs the transaction in the database, and updates the relevant business entity (user profile picture, club logo, or claim document).',
  })
  @ApiOkResponse({
    description: 'Database updated and upload successfully confirmed.',
    type: StorageConfirmResDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid input parameters or failed validation.',
  })
  @ApiForbiddenResponse({
    description: 'You are not authorized to update the target entity.',
  })
  @ResponseMessage('Asset uploaded and database synchronized successfully')
  async confirmUpload(
    @CurrentUser() user: AccessTokenPayload,
    @Body() body: StorageConfirmReqDto,
  ): Promise<StorageConfirmResDto> {
    return this.storageService.confirmUpload(user, body);
  }
}
