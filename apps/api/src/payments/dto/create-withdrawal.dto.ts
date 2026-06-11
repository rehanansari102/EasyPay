import { IsNumber, IsString, Min, Max, IsNotEmpty, Length, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class CreateWithdrawalDto {
  @ApiProperty({ example: 50, description: 'Amount in USD to withdraw' })
  @Transform(({ value }) => Number(value))
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(10, { message: 'Minimum withdrawal is $10' })
  @Max(10000, { message: 'Maximum single withdrawal is $10,000' })
  amount: number;

  @ApiProperty({ example: 'US123456789', description: 'Destination bank account number' })
  @IsString()
  @IsNotEmpty()
  @Length(4, 34)
  bankAccountNumber: string;

  @ApiProperty({ example: 'CHASUS33', description: 'BIC / routing number' })
  @IsString()
  @IsNotEmpty()
  @Length(4, 11)
  @Matches(/^[A-Z0-9]+$/, { message: 'BIC must contain only uppercase letters and digits' })
  bankRoutingNumber: string;

  @ApiProperty({ example: 'John Doe', description: 'Name on bank account' })
  @IsString()
  @IsNotEmpty()
  @Length(2, 70)
  accountHolderName: string;
}
