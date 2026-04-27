import { IsEnum, IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum PkDocType {
  CNIC = 'CNIC',       // Computerized National Identity Card
  NICOP = 'NICOP',     // NIC for Overseas Pakistanis (same format as CNIC)
  PASSPORT = 'PASSPORT',
}

export class SubmitKycDto {
  @ApiProperty({
    enum: PkDocType,
    example: PkDocType.CNIC,
    description: 'CNIC | NICOP format: XXXXX-XXXXXXX-X  |  Passport: AB1234567',
  })
  @IsEnum(PkDocType)
  docType: PkDocType;

  @ApiProperty({
    example: '42101-1234567-1',
    description:
      'CNIC/NICOP: XXXXX-XXXXXXX-X (e.g. 42101-1234567-1) | Passport: two uppercase letters + 7 digits (e.g. AB1234567)',
  })
  @IsString()
  @IsNotEmpty()
  docNumber: string;
}
