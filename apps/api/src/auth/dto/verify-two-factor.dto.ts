import { IsString, IsNotEmpty, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyTwoFactorDto {
  @ApiProperty({ description: 'Temporary session ID returned after successful password auth' })
  @IsString()
  @IsNotEmpty()
  tempSessionId: string;

  @ApiProperty({ description: '6-digit TOTP code from authenticator app', example: '123456' })
  @IsString()
  @Length(6, 6)
  code: string;
}
