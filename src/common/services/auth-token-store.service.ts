import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { RedisService } from './redis.service';

const KEY_PREFIX = 'auth:token';
const EMAIL_VERIFICATION_TTL = 24 * 60 * 60; // 24h
const LOGIN_OTP_TTL = 5 * 60; // 5 min
const LOGIN_2FA_TTL = 5 * 60; // 5 min

export interface EmailVerificationPayload {
  userId: string;
}

export interface LoginOtpPayload {
  userId: string;
  tokenHash: string;
}

export interface Login2FaPayload {
  userId: string;
}

@Injectable()
export class AuthTokenStoreService {
  private readonly logger = new Logger(AuthTokenStoreService.name);

  constructor(
    private readonly redis: RedisService,
    private readonly prisma: PrismaService,
  ) {}

  private key(type: string, id: string): string {
    return `${KEY_PREFIX}:${type}:${id}`;
  }

  // ---------- Email verification ----------
  async setEmailVerificationToken(
    tokenHash: string,
    userId: string,
  ): Promise<boolean> {
    const key = this.key('email_verification', tokenHash);
    const payload: EmailVerificationPayload = { userId };
    const ok = await this.redis.set(
      key,
      JSON.stringify(payload),
      EMAIL_VERIFICATION_TTL,
    );
    if (!ok && this.redis.isAvailable()) {
      this.logger.warn('Redis set email_verification failed, DB will be used');
    }
    return ok;
  }

  async getEmailVerificationToken(
    tokenHash: string,
  ): Promise<EmailVerificationPayload | null> {
    const key = this.key('email_verification', tokenHash);
    const raw = await this.redis.get(key);
    if (raw) {
      try {
        return JSON.parse(raw) as EmailVerificationPayload;
      } catch {
        return null;
      }
    }
    return null;
  }

  async deleteEmailVerificationToken(tokenHash: string): Promise<void> {
    const key = this.key('email_verification', tokenHash);
    await this.redis.del(key);
  }

  // ---------- Login OTP ----------
  async setLoginOtp(
    sessionId: string,
    payload: LoginOtpPayload,
  ): Promise<boolean> {
    const key = this.key('login_otp', sessionId);
    return this.redis.set(key, JSON.stringify(payload), LOGIN_OTP_TTL);
  }

  async getLoginOtp(sessionId: string): Promise<LoginOtpPayload | null> {
    const key = this.key('login_otp', sessionId);
    const raw = await this.redis.get(key);
    if (raw) {
      try {
        return JSON.parse(raw) as LoginOtpPayload;
      } catch {
        return null;
      }
    }
    return null;
  }

  async deleteLoginOtp(sessionId: string): Promise<void> {
    await this.redis.del(this.key('login_otp', sessionId));
  }

  // ---------- Login 2FA pending ----------
  async setLogin2FaPending(sessionId: string, userId: string): Promise<boolean> {
    const key = this.key('login_2fa_pending', sessionId);
    const payload: Login2FaPayload = { userId };
    return this.redis.set(key, JSON.stringify(payload), LOGIN_2FA_TTL);
  }

  async getLogin2FaPending(
    sessionId: string,
  ): Promise<Login2FaPayload | null> {
    const key = this.key('login_2fa_pending', sessionId);
    const raw = await this.redis.get(key);
    if (raw) {
      try {
        return JSON.parse(raw) as Login2FaPayload;
      } catch {
        return null;
      }
    }
    return null;
  }

  async deleteLogin2FaPending(sessionId: string): Promise<void> {
    await this.redis.del(this.key('login_2fa_pending', sessionId));
  }

  // ---------- Forgot password OTP ----------
  async setForgotPasswordOtp(
    sessionId: string,
    payload: LoginOtpPayload,
  ): Promise<boolean> {
    const key = this.key('forgot_password_otp', sessionId);
    return this.redis.set(key, JSON.stringify(payload), LOGIN_OTP_TTL);
  }

  async getForgotPasswordOtp(sessionId: string): Promise<LoginOtpPayload | null> {
    const key = this.key('forgot_password_otp', sessionId);
    const raw = await this.redis.get(key);
    if (raw) {
      try {
        return JSON.parse(raw) as LoginOtpPayload;
      } catch {
        return null;
      }
    }
    return null;
  }

  async deleteForgotPasswordOtp(sessionId: string): Promise<void> {
    await this.redis.del(this.key('forgot_password_otp', sessionId));
  }

  async setForgotPassword2FaPending(sessionId: string, userId: string): Promise<boolean> {
    const key = this.key('forgot_password_2fa_pending', sessionId);
    const payload: Login2FaPayload = { userId };
    return this.redis.set(key, JSON.stringify(payload), LOGIN_2FA_TTL);
  }

  async getForgotPassword2FaPending(sessionId: string): Promise<Login2FaPayload | null> {
    const key = this.key('forgot_password_2fa_pending', sessionId);
    const raw = await this.redis.get(key);
    if (raw) {
      try {
        return JSON.parse(raw) as Login2FaPayload;
      } catch {
        return null;
      }
    }
    return null;
  }

  async deleteForgotPassword2FaPending(sessionId: string): Promise<void> {
    await this.redis.del(this.key('forgot_password_2fa_pending', sessionId));
  }

  // ---------- Change password OTP ----------
  async setChangePasswordOtp(
    sessionId: string,
    payload: LoginOtpPayload,
  ): Promise<boolean> {
    const key = this.key('change_password_otp', sessionId);
    return this.redis.set(key, JSON.stringify(payload), LOGIN_OTP_TTL);
  }

  async getChangePasswordOtp(sessionId: string): Promise<LoginOtpPayload | null> {
    const key = this.key('change_password_otp', sessionId);
    const raw = await this.redis.get(key);
    if (raw) {
      try {
        return JSON.parse(raw) as LoginOtpPayload;
      } catch {
        return null;
      }
    }
    return null;
  }

  async deleteChangePasswordOtp(sessionId: string): Promise<void> {
    await this.redis.del(this.key('change_password_otp', sessionId));
  }

  async setChangePassword2FaPending(sessionId: string, userId: string): Promise<boolean> {
    const key = this.key('change_password_2fa_pending', sessionId);
    const payload: Login2FaPayload = { userId };
    return this.redis.set(key, JSON.stringify(payload), LOGIN_2FA_TTL);
  }

  async getChangePassword2FaPending(sessionId: string): Promise<Login2FaPayload | null> {
    const key = this.key('change_password_2fa_pending', sessionId);
    const raw = await this.redis.get(key);
    if (raw) {
      try {
        return JSON.parse(raw) as Login2FaPayload;
      } catch {
        return null;
      }
    }
    return null;
  }

  async deleteChangePassword2FaPending(sessionId: string): Promise<void> {
    await this.redis.del(this.key('change_password_2fa_pending', sessionId));
  }

  // ---------- DB fallback (for use by callers when Redis returns null) ----------
  /** Check DB for email verification token (fallback when Redis misses). */
  async getEmailVerificationFromDb(tokenHash: string): Promise<{
    id: string;
    userId: string;
  } | null> {
    const row = await this.prisma.authToken.findFirst({
      where: {
        tokenHash,
        type: 'email_verification',
        used: false,
        expiresAt: { gte: new Date() },
      },
      select: { id: true, userId: true },
    });
    return row;
  }

  /** Check DB for login OTP by session id (fallback). */
  async getLoginOtpFromDb(sessionId: string): Promise<{
    userId: string;
    tokenHash: string;
    expiresAt: Date;
  } | null> {
    const row = await this.prisma.authToken.findUnique({
      where: { id: sessionId },
    });
    if (
      !row ||
      row.type !== 'login_otp' ||
      row.used ||
      row.expiresAt < new Date()
    ) {
      return null;
    }
    return {
      userId: row.userId,
      tokenHash: row.tokenHash,
      expiresAt: row.expiresAt,
    };
  }

  /**
   * Returns why an OTP session is invalid (for clearer error messages).
   * Use after getLoginOtp + getLoginOtpFromDb both return null.
   */
  async getLoginOtpInvalidReason(sessionId: string): Promise<
    | 'not_found'
    | 'wrong_type_use_verify_2fa'
    | 'expired'
    | 'already_used'
  > {
    const row = await this.prisma.authToken.findUnique({
      where: { id: sessionId },
    });
    if (!row) return 'not_found';
    if (row.type === 'login_2fa_pending') return 'wrong_type_use_verify_2fa';
    if (row.type !== 'login_otp') return 'not_found';
    if (row.used) return 'already_used';
    if (row.expiresAt < new Date()) return 'expired';
    return 'not_found';
  }

  /** Check DB for login 2FA pending by session id (fallback). */
  async getLogin2FaFromDb(sessionId: string): Promise<{
    userId: string;
    expiresAt: Date;
  } | null> {
    const row = await this.prisma.authToken.findUnique({
      where: { id: sessionId },
    });
    if (
      !row ||
      row.type !== 'login_2fa_pending' ||
      row.used ||
      row.expiresAt < new Date()
    ) {
      return null;
    }
    return { userId: row.userId, expiresAt: row.expiresAt };
  }

  /** DB fallback: forgot_password_otp by session id. */
  async getForgotPasswordOtpFromDb(sessionId: string): Promise<LoginOtpPayload | null> {
    const row = await this.prisma.authToken.findUnique({
      where: { id: sessionId },
    });
    if (
      !row ||
      row.type !== 'forgot_password_otp' ||
      row.used ||
      row.expiresAt < new Date()
    ) {
      return null;
    }
    return { userId: row.userId, tokenHash: row.tokenHash };
  }

  /** DB fallback: forgot_password_2fa_pending by session id. */
  async getForgotPassword2FaFromDb(sessionId: string): Promise<Login2FaPayload | null> {
    const row = await this.prisma.authToken.findUnique({
      where: { id: sessionId },
    });
    if (
      !row ||
      row.type !== 'forgot_password_2fa_pending' ||
      row.used ||
      row.expiresAt < new Date()
    ) {
      return null;
    }
    return { userId: row.userId };
  }

  /** DB fallback: change_password_otp by session id. */
  async getChangePasswordOtpFromDb(sessionId: string): Promise<LoginOtpPayload | null> {
    const row = await this.prisma.authToken.findUnique({
      where: { id: sessionId },
    });
    if (
      !row ||
      row.type !== 'change_password_otp' ||
      row.used ||
      row.expiresAt < new Date()
    ) {
      return null;
    }
    return { userId: row.userId, tokenHash: row.tokenHash };
  }

  /** DB fallback: change_password_2fa_pending by session id. */
  async getChangePassword2FaFromDb(sessionId: string): Promise<Login2FaPayload | null> {
    const row = await this.prisma.authToken.findUnique({
      where: { id: sessionId },
    });
    if (
      !row ||
      row.type !== 'change_password_2fa_pending' ||
      row.used ||
      row.expiresAt < new Date()
    ) {
      return null;
    }
    return { userId: row.userId };
  }
}
