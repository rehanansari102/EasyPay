import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { EnableTwoFactorDto } from './dto/enable-two-factor.dto';
import { VerifyTwoFactorDto } from './dto/verify-two-factor.dto';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { GoogleOAuthGuard } from './guards/google-oauth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { Throttle } from '@nestjs/throttler';

const COOKIE_DEFAULTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
};

@ApiTags('auth')
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  private setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
    res.cookie('access_token', accessToken, {
      ...COOKIE_DEFAULTS,
      maxAge: 15 * 60 * 1000,
    });
    res.cookie('refresh_token', refreshToken, {
      ...COOKIE_DEFAULTS,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/api/v1/auth/refresh',
    });
  }

  private clearAuthCookies(res: Response) {
    res.clearCookie('access_token', { ...COOKIE_DEFAULTS });
    res.clearCookie('refresh_token', { ...COOKIE_DEFAULTS, path: '/api/v1/auth/refresh' });
  }

  // â”€â”€ Core Auth â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  @Public()
  @Post('register')
  @Throttle({ short: { limit: 3, ttl: 60000 } })
  @ApiOperation({ summary: 'Register a new user' })
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.register(dto);
    this.setAuthCookies(res, result.tokens.accessToken, result.tokens.refreshToken);
    return { user: result.user };
  }

  @Public()
  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ short: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Login with email & password' })
  async login(@Req() req: Request, @Res({ passthrough: true }) res: Response, @Body() _dto: LoginDto) {
    const result = await this.authService.login(req.user);

    // 2FA required â€” don't set cookies yet
    if ('requires2fa' in result) {
      return result;
    }

    this.setAuthCookies(res, result.tokens.accessToken, result.tokens.refreshToken);
    return { user: result.user };
  }

  @Public()
  @UseGuards(JwtRefreshGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token using refresh token cookie' })
  async refreshTokens(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const user = req.user as any;
    const refreshToken = req.cookies?.refresh_token;
    const result = await this.authService.refreshTokens(user.id, refreshToken);
    this.setAuthCookies(res, result.tokens.accessToken, result.tokens.refreshToken);
    return { user: result.user };
  }

  @UseGuards(JwtAuthGuard)
  @Delete('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Logout and clear auth cookies' })
  async logout(@CurrentUser('id') userId: string, @Res({ passthrough: true }) res: Response) {
    await this.authService.logout(userId);
    this.clearAuthCookies(res);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Get currently authenticated user' })
  getMe(@CurrentUser() user: any) {
    return user;
  }

  // â”€â”€ Email Verification â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  @Public()
  @Post('email/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify email address using token from email link' })
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto.token);
  }

  @Public()
  @Post('email/resend')
  @HttpCode(HttpStatus.OK)
  @Throttle({ short: { limit: 3, ttl: 300000 } })
  @ApiOperation({ summary: 'Resend email verification link' })
  resendVerificationEmail(@Body() body: { email: string }) {
    return this.authService.resendVerificationEmail(body.email);
  }

  // â”€â”€ Forgot / Reset Password â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ short: { limit: 3, ttl: 300000 } })
  @ApiOperation({ summary: 'Request a password reset link via email' })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ short: { limit: 5, ttl: 300000 } })
  @ApiOperation({ summary: 'Reset password using token from email link' })
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.newPassword);
  }

  // â”€â”€ Two-Factor Authentication â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  @UseGuards(JwtAuthGuard)
  @Post('2fa/generate')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Generate TOTP secret and QR code for 2FA setup' })
  generateTwoFactor(@CurrentUser('id') userId: string) {
    return this.authService.generateTwoFactorSecret(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('2fa/enable')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Enable 2FA after scanning QR code and verifying TOTP code' })
  enableTwoFactor(@CurrentUser('id') userId: string, @Body() dto: EnableTwoFactorDto) {
    return this.authService.enableTwoFactor(userId, dto.code);
  }

  @UseGuards(JwtAuthGuard)
  @Post('2fa/disable')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Disable 2FA using current TOTP code to confirm identity' })
  disableTwoFactor(@CurrentUser('id') userId: string, @Body() dto: EnableTwoFactorDto) {
    return this.authService.disableTwoFactor(userId, dto.code);
  }

  @Public()
  @Post('2fa/verify')
  @HttpCode(HttpStatus.OK)
  @Throttle({ short: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Verify TOTP code during login (completes authentication)' })
  async verifyTwoFactor(
    @Body() dto: VerifyTwoFactorDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.verifyTwoFactorAndLogin(dto.tempSessionId, dto.code);
    this.setAuthCookies(res, result.tokens.accessToken, result.tokens.refreshToken);
    return { user: result.user };
  }

  // ── Google OAuth ──────────────────────────────────────────────
  @Public()
  @UseGuards(GoogleOAuthGuard)
  @Get('google')
  @ApiOperation({ summary: 'Redirect to Google OAuth' })
  googleAuth() {
    // Passport handles redirect
  }

  // ── Change Password ───────────────────────────────────────────

  @Patch('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change password for authenticated users' })
  changePassword(
    @CurrentUser('id') userId: string,
    @Body() body: { currentPassword: string; newPassword: string },
  ) {
    return this.authService.changePassword(userId, body.currentPassword, body.newPassword);
  }

  @Public()
  @UseGuards(GoogleOAuthGuard)
  @Get('google/callback')
  @ApiOperation({ summary: 'Google OAuth callback' })
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    const result = await this.authService.login(req.user);
    if ('requires2fa' in result) {
      const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000');
      return res.redirect(`${frontendUrl}/auth/two-factor?session=${result.tempSessionId}`);
    }
    this.setAuthCookies(res, result.tokens.accessToken, result.tokens.refreshToken);
    const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000');
    return res.redirect(`${frontendUrl}/auth/callback`);
  }
}
