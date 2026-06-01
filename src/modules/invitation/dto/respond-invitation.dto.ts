import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { InvitationRespondAction } from '../constants/invitation-respond-action.enum';

/**
 * Data Transfer Object for responding to a club invitation.
 */
export class RespondToInvitationDto {
  /**
   * The action to perform on the invitation (either ACCEPT or REJECT).
   * @example 'ACCEPT'
   */
  @ApiProperty({
    description: 'Action to perform on the invitation',
    enum: InvitationRespondAction,
    example: InvitationRespondAction.ACCEPT,
  })
  @IsNotEmpty()
  @IsEnum(InvitationRespondAction)
  action: InvitationRespondAction;
}
