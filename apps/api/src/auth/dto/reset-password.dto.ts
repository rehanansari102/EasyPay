import { IsString, IsNotEmpty, MinLength, MaxLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PASSWORD_REGEX } from '@easypay/shared';

export class ResetPasswordDto {
  @ApiProperty({ description: 'Password reset token sent via email' })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({ example: 'NewPass@123', minLength: 8 })
  @IsString()
  @MinLength(8)
  @MaxLength(64)
  @Matches(PASSWORD_REGEX, {
    message: 'Password must contain uppercase, lowercase, number, and special character',
  })
  newPassword: string;
}
