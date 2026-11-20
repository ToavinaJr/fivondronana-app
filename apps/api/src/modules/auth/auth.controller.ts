import { Body, Controller, Get, HttpCode, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBody, ApiTags } from '@nestjs/swagger';
import { AccessTokenGuard, type AuthenticatedRequest } from './access-token.guard.js';
import { AuthService } from './auth.service.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { ActivateAccountDto } from './dto/activate-account.dto.js';
import { LoginDto } from './dto/login.dto.js';

@Controller('auth')
@ApiTags('authentication')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  @ApiBody({ type: LoginDto })
  @HttpCode(200)
  login(@Body() body: LoginDto) {
    return this.auth.login(body.identifier, body.password);
  }

  @Get('me')
  @UseGuards(AccessTokenGuard)
  me(@Req() request: AuthenticatedRequest) {
    return request.auth.user;
  }

  @Post('logout')
  @HttpCode(200)
  @UseGuards(AccessTokenGuard)
  async logout(@Req() request: AuthenticatedRequest) {
    await this.auth.logout(request.auth.sessionId);
    return { status: 'ok' as const };
  }

  @Post('password')
  @ApiBody({ type: ChangePasswordDto })
  @HttpCode(200)
  @UseGuards(AccessTokenGuard)
  async changePassword(@Req() request: AuthenticatedRequest, @Body() body: ChangePasswordDto) {
    await this.auth.changePassword(request.auth.user.id, body.currentPassword, body.newPassword);
    return { status: 'ok' as const };
  }

  @Post('activate')
  @ApiBody({ type: ActivateAccountDto })
  @HttpCode(204)
  async activate(@Body() body: ActivateAccountDto): Promise<void> {
    await this.auth.activateAccount(body.token, body.password);
  }
}
