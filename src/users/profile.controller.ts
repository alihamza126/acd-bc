import {
  Controller,
  Post,
  Put,
  Get,
  Body,
  UseGuards,
  Request,
  UploadedFile,
  UseInterceptors,
  HttpCode,
  HttpStatus,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { UsersService } from './users.service';
import { UpdateUsernameDto } from './dto/update-username.dto';
import { Enable2faDto } from './dto/enable-2fa.dto';
import { RequestChangePasswordDto } from './dto/request-change-password.dto';

@Controller('users/profile')
@UseGuards(JwtAuthGuard)
export class ProfileController {
  constructor(private readonly usersService: UsersService) {}

  @Post('avatar')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('avatar'))
  async updateAvatar(@Request() req: any, @UploadedFile() file: any) {
    return this.usersService.updateAvatar(req.user.id, file);
  }

  @Put('username')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async updateUsername(@Request() req: any, @Body() updateUsernameDto: UpdateUsernameDto) {
    return this.usersService.updateUsername(req.user.id, updateUsernameDto);
  }

  @Get('2fa/secret')
  @HttpCode(HttpStatus.OK)
  async get2FASecret(@Request() req: any) {
    return this.usersService.get2FASecret(req.user.id);
  }

  @Post('2fa/enable')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async enable2FA(@Request() req: any, @Body() enable2faDto: Enable2faDto) {
    return this.usersService.enable2FA(req.user.id, enable2faDto.twoFactorCode);
  }

  @Post('change-password/request')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async requestChangePassword(
    @Request() req: any,
    @Body() requestChangePasswordDto: RequestChangePasswordDto,
  ) {
    return this.usersService.requestChangePassword(
      req.user.id,
      requestChangePasswordDto.currentPassword,
    );
  }
}
