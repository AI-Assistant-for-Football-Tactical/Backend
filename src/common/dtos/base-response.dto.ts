import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsNumber, IsString } from 'class-validator';

export abstract class BaseResponseDto {
  @ApiProperty()
  @IsNumber()
  @IsNotEmpty()
  statusCode: number;

  @ApiProperty({ example: '2025-01-01T12:00:00.000Z' })
  @IsString()
  @IsNotEmpty()
  timestamp: string;

  @IsBoolean()
  @IsNotEmpty()
  success: boolean;
}
