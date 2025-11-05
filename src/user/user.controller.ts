import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Controller('user')
export class UserController {
  constructor(private readonly configService: ConfigService) {}
  @Get()
  getUser() {
    return `Users Are Fine, unlike you 🤡`;
  }
}
