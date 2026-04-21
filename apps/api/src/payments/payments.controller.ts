import { Body, Controller, Headers, Post, RawBodyRequest, Req, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { CreateTopupDto } from './dto/create-topup.dto';

@ApiTags('payments')
@Controller({ path: 'payments', version: '1' })
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @ApiBearerAuth('JWT')
  @UseGuards(JwtAuthGuard)
  @Post('topup')
  @ApiOperation({ summary: 'Create a Stripe PaymentIntent for wallet top-up' })
  createTopup(@CurrentUser('id') userId: string, @Body() dto: CreateTopupDto) {
    return this.paymentsService.createTopup(userId, dto);
  }

  // Stripe webhooks must be PUBLIC (no JWT) and receive raw body
  @Public()
  @Post('webhook')
  @ApiOperation({ summary: 'Stripe webhook endpoint (do not call manually)' })
  handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    return this.paymentsService.handleWebhook(req.rawBody!, signature);
  }
}
