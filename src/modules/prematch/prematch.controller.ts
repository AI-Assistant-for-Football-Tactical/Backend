import { Controller, Get } from '@nestjs/common';
import { PrematchService } from './prematch.service';
import { PreMatchResDto } from './dto/prematch-dto';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';

@ApiTags('Pre-Match Analysis')
@ApiBearerAuth()
@Controller('pre-match')
export class PrematchController {
  constructor(private readonly prematchService: PrematchService) {}

  @ApiOperation({ summary: 'Get pre-match data' })
  @ApiResponse({
    status: 200,
    description: 'Pre-match data retrieved and validated successfully.',
    type: PreMatchResDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid or Expired auth token.' })
  @ApiResponse({
    status: 502,
    description: 'External API is unreachable or returned invalid data.',
  })
  @Get()
  async getPreMath(
    @CurrentUser('club_id') clubId: string,
  ): Promise<PreMatchResDto> {
    return await this.prematchService.preMatchData(clubId);
  }
}
