import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BrevoClient } from '@getbrevo/brevo';

@Injectable()
export class MailerService {
  private readonly logger = new Logger(MailerService.name);
  private readonly client: BrevoClient;
  private readonly fromEmail: string;
  private readonly fromName = 'EasyPay';

  constructor(private configService: ConfigService) {
    this.client = new BrevoClient({
      apiKey: this.configService.getOrThrow('BREVO_API_KEY'),
    });
    this.fromEmail = this.configService.getOrThrow('BREVO_FROM_EMAIL');
  }

  private get frontendUrl() {
    return this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000');
  }

  private async send(to: string, subject: string, html: string) {
    try {
      await this.client.transactionalEmails.sendTransacEmail({
        sender: { name: this.fromName, email: this.fromEmail },
        to: [{ email: to }],
        subject,
        htmlContent: html,
      });
      this.logger.log(`Email sent to ${to}: "${subject}"`);
    } catch (err) {
      this.logger.error(`Failed to send email to ${to}`, err);
      throw new Error('Failed to send email');
    }
  }

  // ── Shared layout wrapper ─────────────────────────────────────
  private layout(content: string): string {
    const year = new Date().getFullYear();
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>EasyPay</title>
</head>
<body style="margin:0;padding:0;background-color:#f0f2f5;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f0f2f5;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:580px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <tr>
          <td style="background:linear-gradient(135deg,#6366f1 0%,#7c3aed 100%);padding:36px 40px;text-align:center;">
            <div style="display:inline-block;background:rgba(255,255,255,0.15);border-radius:12px;padding:10px 22px;">
              <span style="font-size:26px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">&#9889; EasyPay</span>
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:40px 40px 32px;">
            ${content}
          </td>
        </tr>
        <tr>
          <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:24px 40px;text-align:center;">
            <p style="margin:0 0 4px;font-size:12px;color:#9ca3af;">You received this email because you have an account with EasyPay.</p>
            <p style="margin:0;font-size:12px;color:#d1d5db;">&copy; ${year} EasyPay. All rights reserved.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  }

  // ── Email Verification ────────────────────────────────────────
  async sendEmailVerification(to: string, firstName: string, token: string) {
    const verifyUrl = `${this.frontendUrl}/auth/verify-email?token=${token}`;
    const html = this.layout(`
      <div style="text-align:center;margin-bottom:28px;">
        <div style="display:inline-block;background:linear-gradient(135deg,#ede9fe,#ddd6fe);border-radius:50%;width:64px;height:64px;line-height:64px;font-size:28px;">&#9993;</div>
      </div>
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;text-align:center;">Verify your email address</h1>
      <p style="margin:0 0 24px;font-size:15px;color:#6b7280;text-align:center;line-height:1.6;">
        Hi <strong style="color:#111827;">${firstName}</strong>, welcome to EasyPay! &#127881;<br/>
        Just one step left — confirm your email to activate your account.
      </p>
      <div style="text-align:center;margin:28px 0;">
        <a href="${verifyUrl}" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#7c3aed);color:#ffffff;font-size:16px;font-weight:700;padding:16px 40px;border-radius:12px;text-decoration:none;box-shadow:0 4px 14px rgba(99,102,241,0.4);">
          &#10003;&nbsp; Verify My Email
        </a>
      </div>
      <div style="background:#faf5ff;border:1px solid #e9d5ff;border-radius:10px;padding:14px 18px;margin:24px 0;">
        <p style="margin:0;font-size:13px;color:#7c3aed;text-align:center;">&#8987; This link expires in <strong>24 hours</strong>.</p>
      </div>
      <p style="font-size:12px;color:#9ca3af;text-align:center;margin:16px 0 0;word-break:break-all;">
        If the button doesn't work, copy this link:<br/>
        <a href="${verifyUrl}" style="color:#6366f1;">${verifyUrl}</a>
      </p>
      <p style="font-size:12px;color:#d1d5db;text-align:center;margin:20px 0 0;">
        Didn't create an EasyPay account? You can safely ignore this email.
      </p>
    `);
    await this.send(to, '✉️ Verify your EasyPay email address', html);
  }

  // ── Password Reset ────────────────────────────────────────────
  async sendPasswordReset(to: string, firstName: string, token: string) {
    const resetUrl = `${this.frontendUrl}/auth/reset-password?token=${token}`;
    const html = this.layout(`
      <div style="text-align:center;margin-bottom:28px;">
        <div style="display:inline-block;background:linear-gradient(135deg,#fef3c7,#fde68a);border-radius:50%;width:64px;height:64px;line-height:64px;font-size:28px;">&#128274;</div>
      </div>
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;text-align:center;">Reset your password</h1>
      <p style="margin:0 0 24px;font-size:15px;color:#6b7280;text-align:center;line-height:1.6;">
        Hi <strong style="color:#111827;">${firstName}</strong>, we received a request to reset your EasyPay password.<br/>
        Click the button below to choose a new one.
      </p>
      <div style="text-align:center;margin:28px 0;">
        <a href="${resetUrl}" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#7c3aed);color:#ffffff;font-size:16px;font-weight:700;padding:16px 40px;border-radius:12px;text-decoration:none;box-shadow:0 4px 14px rgba(99,102,241,0.4);">
          &#128275;&nbsp; Reset My Password
        </a>
      </div>
      <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:14px 18px;margin:24px 0;">
        <p style="margin:0;font-size:13px;color:#b45309;text-align:center;">&#9888; This link expires in <strong>15 minutes</strong>.</p>
      </div>
      <p style="font-size:12px;color:#9ca3af;text-align:center;margin:16px 0 0;word-break:break-all;">
        If the button doesn't work, copy this link:<br/>
        <a href="${resetUrl}" style="color:#6366f1;">${resetUrl}</a>
      </p>
      <p style="font-size:12px;color:#d1d5db;text-align:center;margin:20px 0 0;">
        If you didn't request this, your password won't change.
      </p>
    `);
    await this.send(to, '🔐 Reset your EasyPay password', html);
  }

  // ── Account Locked ─────────────────────────────────────────────
  async sendAccountLockedAlert(to: string, firstName: string) {
    const resetUrl = `${this.frontendUrl}/auth/forgot-password`;
    const html = this.layout(`
      <div style="text-align:center;margin-bottom:28px;">
        <div style="display:inline-block;background:linear-gradient(135deg,#fee2e2,#fecaca);border-radius:50%;width:64px;height:64px;line-height:64px;font-size:28px;">&#128680;</div>
      </div>
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#dc2626;text-align:center;">Account Temporarily Locked</h1>
      <p style="margin:0 0 24px;font-size:15px;color:#6b7280;text-align:center;line-height:1.6;">
        Hi <strong style="color:#111827;">${firstName}</strong>, your account was locked after <strong>5 failed login attempts</strong>.<br/>
        It will automatically unlock in <strong>15 minutes</strong>.
      </p>
      <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:16px 18px;margin:0 0 24px;">
        <p style="margin:0;font-size:13px;color:#dc2626;text-align:center;">
          &#128683; If this wasn't you, reset your password immediately to secure your account.
        </p>
      </div>
      <div style="text-align:center;margin:0 0 24px;">
        <a href="${resetUrl}" style="display:inline-block;background:linear-gradient(135deg,#dc2626,#b91c1c);color:#ffffff;font-size:16px;font-weight:700;padding:16px 40px;border-radius:12px;text-decoration:none;box-shadow:0 4px 14px rgba(220,38,38,0.35);">
          &#128275;&nbsp; Reset My Password
        </a>
      </div>
      <p style="font-size:12px;color:#d1d5db;text-align:center;margin:0;">
        If you remember your password, simply wait 15 minutes and try again.
      </p>
    `);
    await this.send(to, '🚨 EasyPay: Your account has been temporarily locked', html);
  }

  // ── Transaction Receipt ───────────────────────────────────────
  async sendTransactionReceipt(
    to: string,
    firstName: string,
    opts: {
      direction: 'sent' | 'received';
      amount: number;
      currency: string;
      fee?: number;
      counterpartyName: string;
      reference: string;
      description?: string;
      timestamp: Date;
    },
  ) {
    const isSent = opts.direction === 'sent';
    const amountStr = `${opts.currency} ${opts.amount.toFixed(2)}`;
    const feeStr = opts.fee ? `${opts.currency} ${Number(opts.fee).toFixed(2)}` : 'None';
    const dateStr = opts.timestamp.toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    const html = this.layout(`
      <div style="text-align:center;margin-bottom:24px;">
        <div style="display:inline-block;background:${isSent ? 'linear-gradient(135deg,#fee2e2,#fecaca)' : 'linear-gradient(135deg,#d1fae5,#a7f3d0)'};border-radius:50%;width:64px;height:64px;line-height:64px;font-size:28px;">
          ${isSent ? '&#128197;' : '&#127881;'}
        </div>
      </div>
      <h1 style="margin:0 0 6px;font-size:22px;font-weight:700;color:#111827;text-align:center;">
        ${isSent ? 'Payment Sent' : 'Payment Received'}
      </h1>
      <p style="margin:0 0 28px;font-size:32px;font-weight:800;color:${isSent ? '#dc2626' : '#059669'};text-align:center;">
        ${isSent ? '-' : '+'}${amountStr}
      </p>

      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;margin-bottom:24px;">
        <tr style="background:#f9fafb;">
          <td style="padding:12px 16px;font-size:13px;color:#6b7280;border-bottom:1px solid #e5e7eb;">
            ${isSent ? 'Recipient' : 'Sender'}
          </td>
          <td style="padding:12px 16px;font-size:13px;font-weight:600;color:#111827;text-align:right;border-bottom:1px solid #e5e7eb;">
            ${opts.counterpartyName}
          </td>
        </tr>
        <tr>
          <td style="padding:12px 16px;font-size:13px;color:#6b7280;border-bottom:1px solid #e5e7eb;">Amount</td>
          <td style="padding:12px 16px;font-size:13px;font-weight:600;color:#111827;text-align:right;border-bottom:1px solid #e5e7eb;">${amountStr}</td>
        </tr>
        <tr style="background:#f9fafb;">
          <td style="padding:12px 16px;font-size:13px;color:#6b7280;border-bottom:1px solid #e5e7eb;">Fee</td>
          <td style="padding:12px 16px;font-size:13px;font-weight:600;color:#111827;text-align:right;border-bottom:1px solid #e5e7eb;">${feeStr}</td>
        </tr>
        <tr>
          <td style="padding:12px 16px;font-size:13px;color:#6b7280;border-bottom:1px solid #e5e7eb;">Reference</td>
          <td style="padding:12px 16px;font-size:13px;font-family:monospace;color:#6366f1;text-align:right;border-bottom:1px solid #e5e7eb;">${opts.reference}</td>
        </tr>
        ${opts.description ? `
        <tr style="background:#f9fafb;">
          <td style="padding:12px 16px;font-size:13px;color:#6b7280;border-bottom:1px solid #e5e7eb;">Note</td>
          <td style="padding:12px 16px;font-size:13px;color:#374151;text-align:right;border-bottom:1px solid #e5e7eb;">${opts.description}</td>
        </tr>` : ''}
        <tr style="${opts.description ? '' : 'background:#f9fafb;'}">
          <td style="padding:12px 16px;font-size:13px;color:#6b7280;">Date</td>
          <td style="padding:12px 16px;font-size:13px;color:#374151;text-align:right;">${dateStr}</td>
        </tr>
      </table>

      <p style="font-size:13px;color:#9ca3af;text-align:center;margin:0;">
        If you didn't authorise this transaction, please contact support immediately.
      </p>
    `);

    const subject = isSent
      ? `💸 You sent ${amountStr} — EasyPay`
      : `🎉 You received ${amountStr} — EasyPay`;
    await this.send(to, subject, html);
  }

  // ── Withdrawal Confirmation ───────────────────────────────────
  async sendWithdrawalConfirmation(
    to: string,
    firstName: string,
    opts: { amount: number; currency: string; bankLast4: string; reference: string },
  ) {
    const amountStr = `${opts.currency} ${opts.amount.toFixed(2)}`;
    const html = this.layout(`
      <div style="text-align:center;margin-bottom:24px;">
        <div style="display:inline-block;background:linear-gradient(135deg,#e0e7ff,#c7d2fe);border-radius:50%;width:64px;height:64px;line-height:64px;font-size:28px;">&#127968;</div>
      </div>
      <h1 style="margin:0 0 6px;font-size:22px;font-weight:700;color:#111827;text-align:center;">Withdrawal Initiated</h1>
      <p style="margin:0 0 24px;font-size:15px;color:#6b7280;text-align:center;line-height:1.6;">
        Hi <strong style="color:#111827;">${firstName}</strong>, your withdrawal of
        <strong style="color:#6366f1;">${amountStr}</strong> has been submitted to your bank
        account ending <strong style="color:#111827;">****${opts.bankLast4}</strong>.
      </p>
      <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:10px;padding:16px 20px;margin-bottom:24px;text-align:center;">
        <p style="margin:0 0 4px;font-size:13px;color:#0369a1;font-weight:600;">&#8987; Processing time: 1–3 business days</p>
        <p style="margin:0;font-size:12px;color:#0284c7;">Reference: <span style="font-family:monospace;">${opts.reference}</span></p>
      </div>
      <p style="font-size:12px;color:#d1d5db;text-align:center;margin:0;">
        If you did not request this withdrawal, please contact support immediately.
      </p>
    `);
    await this.send(to, `🏦 Withdrawal of ${amountStr} initiated — EasyPay`, html);
  }
}