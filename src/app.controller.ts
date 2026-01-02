import { Controller, Get } from '@nestjs/common';
import { Public } from './common/decorators/public-endpoint.decorator';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('app')
@Controller()
export class AppController {
  @Public()
  @Get()
  getHello(): string {
    return 'Welcome to Shalaboka_AI API';
  }
}
