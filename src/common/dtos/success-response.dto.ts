import { IsOptional, IsString } from 'class-validator';
import { BaseResponseDto } from './base-response.dto';
import { ApiProperty } from '@nestjs/swagger';

export class SuccessResponseDto extends BaseResponseDto {
  @ApiProperty({ example: true })
  declare success: true;

  @ApiProperty()
  data: unknown;

  @ApiProperty({ example: 'Request Successful' })
  @IsString()
  @IsOptional()
  message?: string;
}
