import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  Req,
  UsePipes,
  ValidationPipe,
  BadRequestException,
} from '@nestjs/common';
import type { Request } from 'express';
import { UsersService } from './users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { Verify2faDto } from './dto/verify-2fa.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { VerifyForgotPasswordOtpDto } from './dto/verify-forgot-password-otp.dto';
import { VerifyForgotPassword2faDto } from './dto/verify-forgot-password-2fa.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyChangePasswordOtpDto } from './dto/verify-change-password-otp.dto';
import { VerifyChangePassword2faDto } from './dto/verify-change-password-2fa.dto';
import { ConfirmChangePasswordDto } from './dto/confirm-change-password.dto';

@Controller('auth')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async register(@Body() registerDto: RegisterDto, @Req() req: Request) {
    const ipAddress = req.ip || req.headers['x-forwarded-for']?.toString() || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.usersService.register(registerDto, ipAddress, userAgent);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async login(@Body() loginDto: LoginDto, @Req() req: Request) {
    const ipAddress = req.ip || req.headers['x-forwarded-for']?.toString() || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.usersService.login(loginDto, ipAddress, userAgent);
  }

  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async verifyOtp(@Body() verifyOtpDto: VerifyOtpDto, @Req() req: Request) {
    const ipAddress = req.ip || req.headers['x-forwarded-for']?.toString() || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    const otp = verifyOtpDto.otp ?? verifyOtpDto.twoFactorCode;
    return this.usersService.verifyOtp(
      verifyOtpDto.loginSessionId,
      otp!,
      ipAddress,
      userAgent,
    );
  }

  @Post('verify-2fa')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async verify2fa(@Body() verify2faDto: Verify2faDto, @Req() req: Request) {
    const ipAddress = req.ip || req.headers['x-forwarded-for']?.toString() || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.usersService.verify2fa(
      verify2faDto.loginSessionId,
      verify2faDto.twoFactorCode,
      ipAddress,
      userAgent,
    );
  }

  @Get('verify-email')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Query('token') token: string, @Req() req: Request) {
    if (!token) {
      throw new BadRequestException('Verification token is required');
    }
    const ipAddress = req.ip || req.headers['x-forwarded-for']?.toString() || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];
    return this.usersService.verifyEmail(token, ipAddress, userAgent);
  }

  // ---------- Forgot password ----------
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.usersService.forgotPassword(forgotPasswordDto.email);
  }

  @Post('verify-forgot-password-otp')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async verifyForgotPasswordOtp(@Body() dto: VerifyForgotPasswordOtpDto) {
    const otp = dto.otp ?? dto.twoFactorCode;
    return this.usersService.verifyForgotPasswordOtp(dto.sessionId, otp!);
  }

  @Post('verify-forgot-password-2fa')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async verifyForgotPassword2fa(@Body() dto: VerifyForgotPassword2faDto) {
    return this.usersService.verifyForgotPassword2fa(dto.sessionId, dto.twoFactorCode);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.usersService.resetPassword(
      resetPasswordDto.sessionId,
      resetPasswordDto.newPassword,
    );
  }

  // ---------- Change password (verify/confirm are public; request is protected) ----------
  @Post('change-password/verify-otp')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async verifyChangePasswordOtp(@Body() dto: VerifyChangePasswordOtpDto) {
    const otp = dto.otp ?? dto.twoFactorCode;
    return this.usersService.verifyChangePasswordOtp(dto.sessionId, otp!);
  }

  @Post('change-password/verify-2fa')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async verifyChangePassword2fa(@Body() dto: VerifyChangePassword2faDto) {
    return this.usersService.verifyChangePassword2fa(dto.sessionId, dto.twoFactorCode);
  }

  @Post('change-password/confirm')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async confirmChangePassword(@Body() dto: ConfirmChangePasswordDto) {
    return this.usersService.confirmChangePassword(dto.sessionId, dto.newPassword);
  }
}
