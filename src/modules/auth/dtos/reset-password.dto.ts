import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Match } from './../../../common/decorators/match.decorator';

export class ResetPasswordReqDto {
  @ApiProperty({
    description: 'The new password.',
    example: 'NewSecurePassword123!',
  })
  @IsString()
  @IsNotEmpty({
    message: 'You have to provide a new password',
  })
  newPassword: string;

  @ApiProperty({
    description: 'Confirmation of the new password.',
    example: 'NewSecurePassword123!',
  })
  @IsString()
  @IsNotEmpty({
    message: 'You have to type the new password again',
  })
  @Match('newPassword', {
    message: 'Passwords do not match',
  })
  newPasswordConfirm: string;
}

export class ResetPasswordResDto {
  @ApiProperty({
    description: 'The new JWT access token.',
  })
  accessToken: string;

  @ApiProperty({
    description: 'The new random refresh token.',
  })
  refreshToken: string;
}
