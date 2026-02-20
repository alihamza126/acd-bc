import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { getEmailConfig } from '../config/email.config';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor() {
    const config = getEmailConfig();
    this.transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.auth,
    });
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      const config = getEmailConfig();
      const mailOptions = {
        from: `"${config.from.name}" <${config.from.email}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text || this.stripHtml(options.html),
      };

      const info = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Email sent successfully to ${options.to}`, info.messageId);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send email to ${options.to}`, error);
      return false;
    }
  }

  async sendVerificationEmail(email: string, verificationToken: string, username: string): Promise<boolean> {
    const verificationUrl = `${process.env.APP_URL || 'http://localhost:3000'}/auth/verify-email?token=${verificationToken}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #4CAF50;">Welcome to Account Deal App!</h2>
            <p>Hi ${username},</p>
            <p>Thank you for registering with us. Please verify your email address by clicking the button below:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}" style="background-color: #4CAF50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Verify Email</a>
            </div>
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #666;">${verificationUrl}</p>
            <p>This link will expire in 24 hours.</p>
            <p>If you didn't create an account, please ignore this email.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="font-size: 12px; color: #999;">© ${new Date().getFullYear()} Account Deal App. All rights reserved.</p>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject: 'Verify Your Email Address',
      html,
    });
  }

  async sendLoginOtpEmail(email: string, username: string, otp: string, expiresInMinutes: number = 5): Promise<boolean> {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #2196F3;">Login Verification Code</h2>
            <p>Hi ${username},</p>
            <p>Use the following one-time code to complete your login:</p>
            <div style="background-color: #e3f2fd; padding: 20px; border-radius: 8px; text-align: center; margin: 25px 0; border: 2px dashed #2196F3;">
              <span style="font-size: 28px; font-weight: bold; letter-spacing: 8px; color: #1976d2;">${otp}</span>
            </div>
            <p>This code will expire in <strong>${expiresInMinutes} minutes</strong>.</p>
            <p>If you didn't request this code, please ignore this email and secure your account.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="font-size: 12px; color: #999;">© ${new Date().getFullYear()} Account Deal App. All rights reserved.</p>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject: 'Your Login Verification Code',
      html,
    });
  }

  async sendLoginNotificationEmail(
    email: string,
    username: string,
    ipAddress?: string,
    userAgent?: string,
    browser?: string,
    os?: string,
    deviceType?: string,
  ): Promise<boolean> {
    const loginTime = new Date().toLocaleString();
    const loginDate = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #2196F3;">✅ Login Successful</h2>
            <p>Hi ${username},</p>
            <p>We detected a successful login to your account. Here are the details:</p>
            <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #2196F3;">
              <h3 style="margin-top: 0; color: #2196F3;">Login Details</h3>
              <p><strong>📅 Date & Time:</strong> ${loginDate} at ${loginTime}</p>
              ${ipAddress ? `<p><strong>🌐 IP Address:</strong> <code style="background-color: #e0e0e0; padding: 2px 6px; border-radius: 3px;">${ipAddress}</code></p>` : ''}
              ${browser ? `<p><strong>🌍 Browser:</strong> ${browser}</p>` : ''}
              ${os ? `<p><strong>💻 Operating System:</strong> ${os}</p>` : ''}
              ${deviceType ? `<p><strong>📱 Device Type:</strong> ${deviceType === 'mobile' ? '📱 Mobile' : '🖥️ Desktop'}</p>` : ''}
              ${userAgent ? `<p style="font-size: 12px; color: #666; margin-top: 10px; word-break: break-all;"><strong>User Agent:</strong> ${userAgent}</p>` : ''}
            </div>
            <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ffc107;">
              <p style="margin: 0;"><strong>⚠️ Security Notice:</strong> If this wasn't you, please secure your account immediately by changing your password.</p>
            </div>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="font-size: 12px; color: #999;">© ${new Date().getFullYear()} Account Deal App. All rights reserved.</p>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject: 'Login Successful - Account Deal App',
      html,
    });
  }

  async sendAccountLockedEmail(
    email: string,
    username: string,
    ipAddress?: string,
    userAgent?: string,
    browser?: string,
    os?: string,
    deviceType?: string,
    failedAttempts?: number,
    lockedUntil?: Date,
  ): Promise<boolean> {
    const lockTime = new Date().toLocaleString();
    const unlockTime = lockedUntil ? lockedUntil.toLocaleString() : 'N/A';
    const minutesLocked = lockedUntil
      ? Math.ceil((lockedUntil.getTime() - Date.now()) / (1000 * 60))
      : 30;
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #f44336;">🔒 Account Locked</h2>
            <p>Hi ${username},</p>
            <p>Your account has been temporarily locked due to multiple failed login attempts.</p>
            <div style="background-color: #ffebee; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #f44336;">
              <h3 style="margin-top: 0; color: #f44336;">Lock Details</h3>
              <p><strong>🔢 Failed Attempts:</strong> ${failedAttempts || 5}</p>
              <p><strong>⏰ Locked At:</strong> ${lockTime}</p>
              <p><strong>🔓 Unlocks At:</strong> ${unlockTime}</p>
              <p><strong>⏳ Duration:</strong> ${minutesLocked} minutes</p>
            </div>
            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3 style="margin-top: 0;">Login Attempt Details</h3>
              ${ipAddress ? `<p><strong>🌐 IP Address:</strong> <code style="background-color: #e0e0e0; padding: 2px 6px; border-radius: 3px;">${ipAddress}</code></p>` : ''}
              ${browser ? `<p><strong>🌍 Browser:</strong> ${browser}</p>` : ''}
              ${os ? `<p><strong>💻 Operating System:</strong> ${os}</p>` : ''}
              ${deviceType ? `<p><strong>📱 Device Type:</strong> ${deviceType === 'mobile' ? '📱 Mobile' : '🖥️ Desktop'}</p>` : ''}
              ${userAgent ? `<p style="font-size: 12px; color: #666; margin-top: 10px; word-break: break-all;"><strong>User Agent:</strong> ${userAgent}</p>` : ''}
            </div>
            <div style="background-color: #e3f2fd; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #2196F3;">
              <h3 style="margin-top: 0; color: #2196F3;">What to do next?</h3>
              <ul style="margin: 10px 0; padding-left: 20px;">
                <li>Wait ${minutesLocked} minutes before attempting to login again</li>
                <li>Make sure you're using the correct password</li>
                <li>If you forgot your password, use the password reset feature</li>
                <li>If this wasn't you, secure your account immediately</li>
              </ul>
            </div>
            <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #ffc107;">
              <p style="margin: 0;"><strong>⚠️ Security Alert:</strong> If you didn't attempt to login, someone may be trying to access your account. Please change your password immediately and review your account security settings.</p>
            </div>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="font-size: 12px; color: #999;">© ${new Date().getFullYear()} Account Deal App. All rights reserved.</p>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail({
      to: email,
      subject: 'Account Locked - Account Deal App',
      html,
    });
  }

  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
  }
}
