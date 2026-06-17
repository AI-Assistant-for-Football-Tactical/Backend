import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsUrl,
  MaxLength,
  IsOptional,
  IsArray,
} from 'class-validator';

/**
 * DTO for submitting a new club ownership claim.
 * Matches exactly the requested payload contract, while remaining compatible
 * with the underlying database entity properties.
 *
 * @field external_club_id  - External SofaScore team ID the user is claiming
 * @field verification_url  - URL of the uploaded verification document
 * @field club_name         - Optional human-readable name of the club (falls back to ID if omitted)
 * @field justification     - Optional justification text
 */
export class SubmitClaimDto {
  @ApiProperty({
    description: 'External SofaScore team ID being claimed',
    example: '12345',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  external_club_id: string;

  @ApiProperty({
    description: 'List of verification URLs proving club affiliation/ownership',
    example: ['https://cdn.example.com/verification.pdf'],
    type: [String],
  })
  @IsArray()
  @IsNotEmpty()
  @IsUrl({}, { each: true })
  document_urls: string[];

  @ApiPropertyOptional({
    description: 'Human-readable name of the club',
    example: 'Al Ahly SC',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  club_name?: string;

  @ApiPropertyOptional({
    description:
      'Optional justification explaining why you should manage this club',
    example: 'I am the official marketing manager of Al Ahly.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  justification?: string;
}
