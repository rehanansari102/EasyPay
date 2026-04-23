import { IsOptional, IsEnum, IsDateString, IsNumber, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { TransactionType, TransactionStatus } from '@easypay/shared';

export class TransactionFiltersDto {
  @ApiPropertyOptional({ enum: ['DEPOSIT','WITHDRAWAL','TRANSFER','FEE','REVERSAL'] })
  @IsOptional()
  @IsEnum(['DEPOSIT','WITHDRAWAL','TRANSFER','FEE','REVERSAL'])
  type?: TransactionType;

  @ApiPropertyOptional({ enum: ['PENDING','COMPLETED','FAILED','REVERSED'] })
  @IsOptional()
  @IsEnum(['PENDING','COMPLETED','FAILED','REVERSED'])
  status?: TransactionStatus;

  @ApiPropertyOptional({ example: '2025-01-01' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ example: '2025-12-31' })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
