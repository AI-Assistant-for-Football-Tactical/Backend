import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { SystemRole } from '../../../common/enums/system-role.enum';

/**
 * DTO for promoting a user to a new system role.
 */
export class PromoteUserDto {
  @ApiProperty({
    description: 'The new system role to assign to the user',
    enum: SystemRole,
    example: SystemRole.ADMIN,
  })
  @IsEnum(SystemRole)
  @IsNotEmpty()
  role: SystemRole;
}
