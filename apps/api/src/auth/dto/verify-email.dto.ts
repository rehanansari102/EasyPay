import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyEmailDto {
  @ApiProperty({ description: 'Email verification token sent via email' })
  @IsString()
  @IsNotEmpty()
  token: string;
}
