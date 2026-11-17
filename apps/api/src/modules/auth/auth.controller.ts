import { BadRequestException, Body, Controller, Get, HttpCode, Post, Req, UseGuards } from '@nestjs/common';
import { AccessTokenGuard, type AuthenticatedRequest } from './access-token.guard.js';
import { AuthService } from './auth.service.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  @HttpCode(200)
  login(@Body() body: { identifier?: unknown; password?: unknown }) {
    if (typeof body?.identifier !== 'string' || !body.identifier.trim() || typeof body.password !== 'string' || !body.password) {
      throw new BadRequestException('Les champs identifier et password sont obligatoires.');
    }
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
  @HttpCode(200)
  @UseGuards(AccessTokenGuard)
  async changePassword(@Req() request: AuthenticatedRequest, @Body() body: { currentPassword?: unknown; newPassword?: unknown }) {
    if (typeof body?.currentPassword !== 'string' || typeof body.newPassword !== 'string') {
      throw new BadRequestException('Les champs currentPassword et newPassword sont obligatoires.');
    }
    await this.auth.changePassword(request.auth.user.id, body.currentPassword, body.newPassword);
    return { status: 'ok' as const };
  }
}
