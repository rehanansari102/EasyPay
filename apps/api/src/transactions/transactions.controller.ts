import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TransactionsService } from './transactions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { TransferDto } from './dto/transfer.dto';
import { TransactionFiltersDto } from './dto/transaction-filters.dto';

@ApiTags('transactions')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller({ path: 'transactions', version: '1' })
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post('transfer')
  @ApiOperation({ summary: 'Transfer money to another wallet' })
  transfer(@CurrentUser('id') userId: string, @Body() dto: TransferDto) {
    return this.transactionsService.transfer(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get paginated transaction history' })
  getHistory(@CurrentUser('id') userId: string, @Query() filters: TransactionFiltersDto) {
    return this.transactionsService.getHistory(userId, filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific transaction by ID' })
  getById(@CurrentUser('id') userId: string, @Param('id') txId: string) {
    return this.transactionsService.getById(userId, txId);
  }
}
