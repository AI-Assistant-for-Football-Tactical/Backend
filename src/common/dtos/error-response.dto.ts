import { IsArray, IsNotEmpty, IsString } from 'class-validator';
import { BaseResponseDto } from './base-response.dto';
import { BadRequestException } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';

export class ErrorResponseDto extends BaseResponseDto {
  @ApiProperty({ example: false })
  declare success: false;

  @ApiProperty({ example: BadRequestException.name })
  @IsString()
  @IsNotEmpty()
  errorType: string;

  @ApiProperty()
  @IsArray()
  @IsNotEmpty()
  messages: string[];

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  path: string;
}
