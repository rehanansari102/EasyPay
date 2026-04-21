import { IsString, IsOptional, IsNumber, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateVirtualCardDto {
  @ApiProperty({ example: 'Alice Johnson' })
  @IsString()
  nameOnCard: string;

  @ApiPropertyOptional({ example: 500 })
  @IsOptional()
  @IsNumber()
  @Min(10)
  spendingLimit?: number;
}
