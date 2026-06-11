import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { WalletService } from './wallet.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateVirtualCardDto } from './dto/create-virtual-card.dto';

@ApiTags('wallet')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller({ path: 'wallet', version: '1' })
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get()
  @ApiOperation({ summary: 'Get my wallet details and balance' })
  getWallet(@CurrentUser('id') userId: string) {
    return this.walletService.getWallet(userId);
  }

  @Get('cards')
  @ApiOperation({ summary: 'List all virtual cards' })
  getCards(@CurrentUser('id') userId: string) {
    return this.walletService.getVirtualCards(userId);
  }

  @Post('cards')
  @ApiOperation({ summary: 'Create a new virtual card' })
  createCard(@CurrentUser('id') userId: string, @Body() dto: CreateVirtualCardDto) {
    return this.walletService.createVirtualCard(userId, dto);
  }

  @Patch('cards/:id/toggle-freeze')
  @ApiOperation({ summary: 'Freeze or unfreeze a virtual card' })
  toggleFreeze(@CurrentUser('id') userId: string, @Param('id') cardId: string) {
    return this.walletService.freezeCard(userId, cardId);
  }

  @Delete('cards/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Cancel (soft-delete) a virtual card — must be frozen first' })
  deleteCard(@CurrentUser('id') userId: string, @Param('id') cardId: string) {
    return this.walletService.deleteCard(userId, cardId);
  }
}
