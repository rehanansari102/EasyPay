import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('admin')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller({ path: 'admin', version: '1' })
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ── Dashboard ─────────────────────────────────────────────────

  @Get('stats')
  @ApiOperation({ summary: 'Get platform dashboard stats' })
  getStats() {
    return this.adminService.getDashboardStats();
  }

  // ── Users ─────────────────────────────────────────────────────

  @Get('users')
  @ApiOperation({ summary: 'List all users (paginated, searchable)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  getUsers(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('search') search?: string,
  ) {
    return this.adminService.getUsers(+page, +limit, search);
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'Get full user details with wallet and audit logs' })
  getUserById(@Param('id') id: string) {
    return this.adminService.getUserById(id);
  }

  @Patch('users/:id/activate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Activate a suspended user account' })
  activateUser(@Param('id') id: string) {
    return this.adminService.toggleUserActive(id, true);
  }

  @Patch('users/:id/suspend')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Suspend a user account' })
  suspendUser(@Param('id') id: string) {
    return this.adminService.toggleUserActive(id, false);
  }

  @Patch('users/:id/kyc')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve or reject user KYC' })
  updateKyc(
    @Param('id') id: string,
    @Body() body: { status: 'APPROVED' | 'REJECTED'; notes?: string },
  ) {
    return this.adminService.updateKycStatus(id, body.status, body.notes);
  }

  // ── KYC Review ────────────────────────────────────────────────

  @Get('kyc')
  @ApiOperation({ summary: 'List KYC submissions (filterable by status)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String, example: 'SUBMITTED' })
  getKycSubmissions(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('status') status = 'SUBMITTED',
  ) {
    return this.adminService.getKycSubmissions(+page, +limit, status);
  }

  @Get('kyc/:userId')
  @ApiOperation({ summary: 'Get a user KYC document with presigned image URLs (1 h)' })
  getKycDocument(@Param('userId') userId: string) {
    return this.adminService.getKycDocument(userId);
  }

  // ── Wallets ───────────────────────────────────────────────────

  @Get('wallets')
  @ApiOperation({ summary: 'List all wallets (paginated)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getWallets(@Query('page') page = 1, @Query('limit') limit = 20) {
    return this.adminService.getWallets(+page, +limit);
  }

  @Patch('wallets/:id/suspend')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Suspend a wallet' })
  suspendWallet(@Param('id') id: string) {
    return this.adminService.toggleWalletStatus(id, 'SUSPENDED');
  }

  @Patch('wallets/:id/activate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Activate a suspended wallet' })
  activateWallet(@Param('id') id: string) {
    return this.adminService.toggleWalletStatus(id, 'ACTIVE');
  }

  // ── Transactions ──────────────────────────────────────────────

  @Get('transactions')
  @ApiOperation({ summary: 'List all transactions (paginated, filterable)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'type', required: false, type: String })
  getTransactions(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('status') status?: string,
    @Query('type') type?: string,
  ) {
    return this.adminService.getAllTransactions(+page, +limit, status, type);
  }

  @Post('transactions/:id/reverse')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reverse a completed transfer transaction' })
  reverseTransaction(
    @Param('id') id: string,
    @CurrentUser('id') adminId: string,
  ) {
    return this.adminService.reverseTransaction(id, adminId);
  }

  // ── Audit Logs ────────────────────────────────────────────────

  @Get('audit-logs')
  @ApiOperation({ summary: 'View platform-wide audit logs' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'userId', required: false, type: String })
  getAuditLogs(
    @Query('page') page = 1,
    @Query('limit') limit = 50,
    @Query('userId') userId?: string,
  ) {
    return this.adminService.getAuditLogs(+page, +limit, userId);
  }
}
