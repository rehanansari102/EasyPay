import { IsString, IsNumber, IsOptional, Min, Max, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MAX_TRANSFER_AMOUNT, MIN_TRANSFER_AMOUNT } from '@easypay/shared';

export class TransferDto {
  @ApiProperty({ example: '1234567890', description: '10-digit account number' })
  @IsString()
  toAccountNumber: string;

  @ApiProperty({ example: 100 })
  @IsNumber()
  @Min(MIN_TRANSFER_AMOUNT)
  @Max(MAX_TRANSFER_AMOUNT)
  amount: number;

  @ApiPropertyOptional({ example: 'Rent payment' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;
}
