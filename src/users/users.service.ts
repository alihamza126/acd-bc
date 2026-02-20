import {
  Injectable,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../common/database/prisma.service';
import { AuthTokenStoreService } from '../common/services/auth-token-store.service';
import { EmailService } from '../common/services/email.service';
import { StorageService } from '../common/services/storage.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateUsernameDto } from './dto/update-username.dto';
import { hashPassword, comparePassword } from './helpers/password.helper';
import { generateVerificationToken, generateTokenHash } from './helpers/token.helper';
import { generateOtp, hashOtp, getOtpExpirySeconds } from './helpers/otp.helper';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import { verifySync, TOTP, generateURI } from 'otplib';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly authTokenStore: AuthTokenStoreService,
    private readonly emailService: EmailService,
    private readonly storageService: StorageService,
    private readonly jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto, ipAddress?: string, userAgent?: string) {
    try {
      const { email, username, password } = registerDto;

      const existingUser = await this.prisma.user.findFirst({
        where: {
          OR: [{ email }, { username }],
        },
      });

      if (existingUser) {
        if (existingUser.email === email) {
          throw new ConflictException('Email already registered');
        }
        if (existingUser.username === username) {
          throw new ConflictException('Username already taken');
        }
      }

      const passwordHash = await hashPassword(password);
      const verificationToken = generateVerificationToken();
      const tokenHash = generateTokenHash(verificationToken);

      const user = await this.prisma.user.create({
        data: {
          email,
          username,
          passwordHash,
          status: 'unverified',
          emailVerified: false,
          security: {
            create: {
              failedAttempts: 0,
              twoFactorEnabled: false,
            },
          },
        },
      });

      await this.prisma.authToken.create({
        data: {
          userId: user.id,
          type: 'email_verification',
          tokenHash,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });
      await this.authTokenStore.setEmailVerificationToken(tokenHash, user.id);

      await this.prisma.userDevice.create({
        data: {
          userId: user.id,
          fingerprint: this.generateFingerprint(ipAddress, userAgent),
          ipAddress: ipAddress || null,
          userAgent: userAgent || null,
          browser: this.extractBrowser(userAgent),
          os: this.extractOS(userAgent),
          deviceType: this.extractDeviceType(userAgent),
        },
      });

      await this.emailService.sendVerificationEmail(email, verificationToken, username);

      this.logger.log(`User registered: ${user.id} (${email})`);

      return {
        message: 'Registration successful. Please check your email to verify your account.',
        userId: user.id,
      };
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      this.logger.error('Registration failed', error);
      throw new BadRequestException('Registration failed. Please try again.');
    }
  }

  async login(loginDto: LoginDto, ipAddress?: string, userAgent?: string) {
    try {
      const { email, password } = loginDto;

      const user = await this.prisma.user.findUnique({
        where: { email },
        include: {
          security: true,
        },
      });

      if (!user) {
        throw new UnauthorizedException('Invalid email or password');
      }

      if (user.deletedAt) {
        throw new UnauthorizedException('Account has been deleted');
      }

      if (user.security?.lockedUntil && user.security.lockedUntil > new Date()) {
        const minutesLeft = Math.ceil(
          (user.security.lockedUntil.getTime() - Date.now()) / (1000 * 60),
        );
        throw new UnauthorizedException(`Account is locked. Try again in ${minutesLeft} minutes.`);
      }

      const isPasswordValid = await comparePassword(password, user.passwordHash || '');

      if (!isPasswordValid) {
        const failedAttempts = (user.security?.failedAttempts || 0) + 1;
        const maxAttempts = 5;
        const lockDuration = 30 * 60 * 1000;
        const lockedUntil = failedAttempts >= maxAttempts ? new Date(Date.now() + lockDuration) : null;

        await this.prisma.userSecurity.update({
          where: { userId: user.id },
          data: {
            failedAttempts,
            lockedUntil,
          },
        });

        if (failedAttempts >= maxAttempts && lockedUntil) {
          const browser = this.extractBrowser(userAgent);
          const os = this.extractOS(userAgent);
          const deviceType = this.extractDeviceType(userAgent);
          
          await this.emailService.sendAccountLockedEmail(
            user.email,
            user.username,
            ipAddress || undefined,
            userAgent || undefined,
            browser || undefined,
            os || undefined,
            deviceType || undefined,
            failedAttempts,
            lockedUntil,
          );
        }

        throw new UnauthorizedException('Invalid email or password');
      }

      if (user.security && user.security.failedAttempts > 0) {
        await this.prisma.userSecurity.update({
          where: { userId: user.id },
          data: {
            failedAttempts: 0,
            lockedUntil: null,
          },
        });
      }

      if (!user.emailVerified) {
        const verificationToken = generateVerificationToken();
        const tokenHash = generateTokenHash(verificationToken);
        await this.prisma.authToken.create({
          data: {
            userId: user.id,
            type: 'email_verification',
            tokenHash,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          },
        });
        await this.authTokenStore.setEmailVerificationToken(tokenHash, user.id);
        await this.emailService.sendVerificationEmail(
          user.email,
          verificationToken,
          user.username,
        );
        this.logger.log(`Resent verification email for unverified login: ${user.id}`);
        throw new BadRequestException(
          'Email not verified. A new verification link has been sent to your email.',
        );
      }

      const otp = generateOtp();
      const otpHash = hashOtp(otp);
      const expiresAt = new Date(Date.now() + getOtpExpirySeconds() * 1000);

      const authToken = await this.prisma.authToken.create({
        data: {
          userId: user.id,
          type: 'login_otp',
          tokenHash: otpHash,
          expiresAt,
        },
      });
      await this.authTokenStore.setLoginOtp(authToken.id, {
        userId: user.id,
        tokenHash: otpHash,
      });

      await this.emailService.sendLoginOtpEmail(
        user.email,
        user.username,
        otp,
        Math.floor(getOtpExpirySeconds() / 60),
      );

      this.logger.log(`OTP sent to user: ${user.id} (${email})`);

      return {
        message: 'OTP sent to your email. Please verify to continue.',
        loginSessionId: authToken.id,
        expiresIn: getOtpExpirySeconds(),
      };
    } catch (error) {
      if (
        error instanceof UnauthorizedException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error('Login failed', error);
      throw new UnauthorizedException('Login failed. Please try again.');
    }
  }

  async verifyOtp(
    loginSessionId: string,
    otp: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    try {
      let payload = await this.authTokenStore.getLoginOtp(loginSessionId);
      if (!payload) {
        const fromDb = await this.authTokenStore.getLoginOtpFromDb(loginSessionId);
        if (fromDb) payload = { userId: fromDb.userId, tokenHash: fromDb.tokenHash };
      }
      if (!payload) {
        throw new BadRequestException('Invalid or expired login session');
      }

      const otpHash = hashOtp(otp);
      if (payload.tokenHash !== otpHash) {
        throw new UnauthorizedException('Invalid OTP');
      }

      const user = await this.prisma.user.findUnique({
        where: { id: payload.userId },
        include: { security: true },
      });
      if (!user || user.deletedAt) {
        throw new UnauthorizedException('Account has been deleted');
      }

      await this.prisma.authToken.updateMany({
        where: { id: loginSessionId },
        data: { used: true, usedAt: new Date() },
      });
      await this.authTokenStore.deleteLoginOtp(loginSessionId);

      if (user.security?.twoFactorEnabled && user.security.twoFactorSecret) {
        const twoFaToken = await this.prisma.authToken.create({
          data: {
            userId: user.id,
            type: 'login_2fa_pending',
            tokenHash: crypto.randomBytes(32).toString('hex'),
            expiresAt: new Date(Date.now() + 5 * 60 * 1000),
          },
        });
        await this.authTokenStore.setLogin2FaPending(twoFaToken.id, user.id);
        this.logger.log(`2FA required for user: ${user.id}`);
        return {
          requiresTwoFactor: true,
          loginSessionId: twoFaToken.id,
          expiresIn: 300,
        };
      }

      return this.completeLogin(user.id, ipAddress, userAgent);
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }
      this.logger.error('OTP verification failed', error);
      throw new BadRequestException('OTP verification failed');
    }
  }

  async verify2fa(
    loginSessionId: string,
    twoFactorCode: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    try {
      let payload = await this.authTokenStore.getLogin2FaPending(loginSessionId);
      if (!payload) {
        const fromDb = await this.authTokenStore.getLogin2FaFromDb(loginSessionId);
        if (fromDb) payload = { userId: fromDb.userId };
      }
      if (!payload) {
        throw new BadRequestException('Invalid or expired login session');
      }

      const user = await this.prisma.user.findUnique({
        where: { id: payload.userId },
        include: { security: true },
      });
      if (!user?.security?.twoFactorEnabled || !user.security.twoFactorSecret) {
        throw new BadRequestException('2FA is not enabled for this account');
      }

      const result = verifySync({
        secret: user.security.twoFactorSecret,
        token: twoFactorCode,
      });
      if (!result.valid) {
        throw new UnauthorizedException('Invalid two-factor code');
      }

      await this.prisma.authToken.updateMany({
        where: { id: loginSessionId },
        data: { used: true, usedAt: new Date() },
      });
      await this.authTokenStore.deleteLogin2FaPending(loginSessionId);

      return this.completeLogin(user.id, ipAddress, userAgent);
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }
      this.logger.error('2FA verification failed', error);
      throw new BadRequestException('2FA verification failed');
    }
  }

  private async completeLogin(
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: { security: true },
    });

    const lastLoginAt = new Date();
    await this.prisma.userSecurity.update({
      where: { userId: user.id },
      data: {
        lastLoginAt,
        lastLoginIp: ipAddress || null,
      },
    });

    const deviceFingerprint = this.generateFingerprint(ipAddress, userAgent);
    const browser = this.extractBrowser(userAgent);
    const os = this.extractOS(userAgent);
    const deviceType = this.extractDeviceType(userAgent);

    await this.prisma.userDevice.upsert({
      where: {
        userId_fingerprint: {
          userId: user.id,
          fingerprint: deviceFingerprint,
        },
      },
      create: {
        userId: user.id,
        fingerprint: deviceFingerprint,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
        browser,
        os,
        deviceType,
        lastSeen: lastLoginAt,
      },
      update: { lastSeen: lastLoginAt },
    });

    const accessToken = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      username: user.username,
    });

    await this.emailService.sendLoginNotificationEmail(
      user.email,
      user.username,
      ipAddress || undefined,
      userAgent || undefined,
      browser || undefined,
      os || undefined,
      deviceType || undefined,
    );

    this.logger.log(`User logged in: ${user.id} (${user.email})`);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        emailVerified: user.emailVerified,
        status: user.status,
      },
    };
  }

  private generateFingerprint(ipAddress?: string, userAgent?: string): string {
    const crypto = require('crypto');
    const data = `${ipAddress || 'unknown'}-${userAgent || 'unknown'}`;
    return crypto.createHash('sha256').update(data).digest('hex').substring(0, 32);
  }

  private extractBrowser(userAgent?: string): string | null {
    if (!userAgent) return null;
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    return 'Unknown';
  }

  private extractOS(userAgent?: string): string | null {
    if (!userAgent) return null;
    if (userAgent.includes('Windows')) return 'Windows';
    if (userAgent.includes('Mac')) return 'macOS';
    if (userAgent.includes('Linux')) return 'Linux';
    if (userAgent.includes('Android')) return 'Android';
    if (userAgent.includes('iOS')) return 'iOS';
    return 'Unknown';
  }

  private extractDeviceType(userAgent?: string): string | null {
    if (!userAgent) return null;
    if (/Mobile|Android|iPhone|iPad/.test(userAgent)) return 'mobile';
    return 'desktop';
  }

  async verifyEmail(
    token: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    try {
      const tokenHash = generateTokenHash(token);

      let userId: string | null =
        (await this.authTokenStore.getEmailVerificationToken(tokenHash))?.userId ??
        null;
      if (!userId) {
        const fromDb = await this.authTokenStore.getEmailVerificationFromDb(tokenHash);
        if (fromDb) userId = fromDb.userId;
      }

      if (!userId) {
        throw new BadRequestException('Invalid or expired verification token');
      }

      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });
      if (!user) {
        throw new BadRequestException('Invalid or expired verification token');
      }
      if (user.emailVerified) {
        throw new BadRequestException('Email already verified');
      }

      await this.prisma.$transaction([
        this.prisma.user.update({
          where: { id: userId },
          data: {
            emailVerified: true,
            status: 'active',
          },
        }),
        this.prisma.authToken.updateMany({
          where: { tokenHash, type: 'email_verification' },
          data: { used: true, usedAt: new Date() },
        }),
      ]);
      await this.authTokenStore.deleteEmailVerificationToken(tokenHash);

      this.logger.log(`Email verified for user: ${userId}`);

      return this.completeLogin(userId, ipAddress, userAgent);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('Email verification failed', error);
      throw new BadRequestException('Email verification failed');
    }
  }

  async updateAvatar(userId: string, file: any) {
    try {
      if (!file) {
        throw new BadRequestException('No file provided');
      }

      const user = await this.prisma.user.findUniqueOrThrow({
        where: { id: userId },
      });

      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      const uploadResult = await this.storageService.uploadFile(
        file,
        'avatars',
        allowedTypes,
      );

      const oldAvatarUrl = user.avatarUrl;

      await this.prisma.user.update({
        where: { id: userId },
        data: { avatarUrl: uploadResult.url },
      });

      if (oldAvatarUrl) {
        await this.storageService.deleteFile(oldAvatarUrl);
      }

      this.logger.log(`Avatar updated for user: ${userId}`);

      return {
        message: 'Avatar updated successfully',
        avatarUrl: uploadResult.url,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('Avatar update failed', error);
      throw new BadRequestException('Failed to update avatar');
    }
  }

  async updateUsername(userId: string, updateUsernameDto: UpdateUsernameDto) {
    try {
      const user = await this.prisma.user.findUniqueOrThrow({
        where: { id: userId },
        include: { security: true },
      });

      if (user.username === updateUsernameDto.username) {
        throw new BadRequestException('New username must be different from current username');
      }

      const existingUser = await this.prisma.user.findUnique({
        where: { username: updateUsernameDto.username },
      });

      if (existingUser) {
        throw new ConflictException('Username already taken');
      }

      const lastUsernameChange = user.security?.lastUsernameChangeAt;
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

      if (lastUsernameChange && lastUsernameChange > oneMonthAgo) {
        const daysRemaining = Math.ceil(
          (lastUsernameChange.getTime() + 30 * 24 * 60 * 60 * 1000 - Date.now()) /
            (1000 * 60 * 60 * 24),
        );
        throw new BadRequestException(
          `Username can only be changed once per month. Please try again in ${daysRemaining} days.`,
        );
      }

      await this.prisma.$transaction([
        this.prisma.user.update({
          where: { id: userId },
          data: { username: updateUsernameDto.username },
        }),
        this.prisma.userSecurity.update({
          where: { userId },
          data: { lastUsernameChangeAt: new Date() },
        }),
      ]);

      this.logger.log(`Username updated for user: ${userId} to ${updateUsernameDto.username}`);

      return {
        message: 'Username updated successfully',
        username: updateUsernameDto.username,
      };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      this.logger.error('Username update failed', error);
      throw new BadRequestException('Failed to update username');
    }
  }

  async get2FASecret(userId: string) {
    try {
      const user = await this.prisma.user.findUniqueOrThrow({
        where: { id: userId },
        include: { security: true },
      });

      if (user.security?.twoFactorEnabled) {
        throw new BadRequestException('2FA is already enabled');
      }

      const serviceName = 'Account Deal App';
      const totp = new TOTP();
      const secret = totp.generateSecret();
      const otpAuthUrl = generateURI({
        secret,
        label: user.email,
        issuer: serviceName,
      });

      await this.prisma.userSecurity.update({
        where: { userId },
        data: {
          twoFactorSecret: secret,
          twoFactorMethod: 'totp',
        },
      });

      this.logger.log(`2FA secret generated for user: ${userId}`);

      return {
        secret,
        otpAuthUrl,
        qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpAuthUrl)}`,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error('2FA secret generation failed', error);
      throw new BadRequestException('Failed to generate 2FA secret');
    }
  }

  async enable2FA(userId: string, twoFactorCode: string) {
    try {
      const user = await this.prisma.user.findUniqueOrThrow({
        where: { id: userId },
        include: { security: true },
      });

      if (user.security?.twoFactorEnabled) {
        throw new BadRequestException('2FA is already enabled');
      }

      if (!user.security?.twoFactorSecret) {
        throw new BadRequestException('2FA secret not found. Please generate a secret first.');
      }

      const result = verifySync({
        secret: user.security.twoFactorSecret,
        token: twoFactorCode,
      });

      if (!result.valid) {
        throw new UnauthorizedException('Invalid two-factor code');
      }

      await this.prisma.userSecurity.update({
        where: { userId },
        data: {
          twoFactorEnabled: true,
        },
      });

      this.logger.log(`2FA enabled for user: ${userId}`);

      return {
        message: 'Two-factor authentication enabled successfully',
      };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }
      this.logger.error('2FA enable failed', error);
      throw new BadRequestException('Failed to enable 2FA');
    }
  }
}
