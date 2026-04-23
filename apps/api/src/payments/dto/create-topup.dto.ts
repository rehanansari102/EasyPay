import { IsNumber, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { MAX_TOPUP_AMOUNT, MIN_TOPUP_AMOUNT } from '@easypay/shared';

export class CreateTopupDto {
  @ApiProperty({ example: 100, description: `Min $${MIN_TOPUP_AMOUNT}, Max $${MAX_TOPUP_AMOUNT}` })
  @IsNumber()
  @Min(MIN_TOPUP_AMOUNT)
  @Max(MAX_TOPUP_AMOUNT)
  amount: number;
}
