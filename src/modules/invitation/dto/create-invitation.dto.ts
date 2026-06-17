import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

/**
 * Data Transfer Object for creating a new invitation.
 */
export class CreateInvitationDto {
  /**
   * The email address of the registered user being invited to join the club.
   * Must be a valid email format.
   * @example 'player1@example.com'
   */
  @ApiProperty({
    description:
      'Email of the user to invite - Must be a registered user who is not in any club',
    example: 'player1@example.com',
  })
  @IsNotEmpty()
  @IsEmail()
  targetEmail: string;
}
