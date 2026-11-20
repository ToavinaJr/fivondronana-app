import { Body, Controller, Get, HttpCode, Post, Req, Res, UnauthorizedException, UseGuards } from '@nestjs/common';
import { ApiBody, ApiTags } from '@nestjs/swagger';
import { randomBytes } from 'node:crypto';
import { AccessTokenGuard, type AuthenticatedRequest } from './access-token.guard.js';
import { AuthService } from './auth.service.js';
import { ChangePasswordDto } from './dto/change-password.dto.js';
import { ActivateAccountDto } from './dto/activate-account.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { RefreshSessionDto } from './dto/refresh-session.dto.js';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto.js';
import { CompletePasswordResetDto } from './dto/complete-password-reset.dto.js';
import {
  ACCESS_COOKIE,
  CSRF_COOKIE,
  REFRESH_COOKIE,
  clearSessionCookies,
  readCookie,
  serializeSessionCookie,
} from './browser-session.js';

type BrowserResponse = { setHeader(name: string, value: string | string[]): void };
type BrowserRequest = { headers: { cookie?: string }; auth: { user: { id: string } } };

@Controller('auth')
@ApiTags('authentication')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  @ApiBody({ type: LoginDto })
  @HttpCode(200)
  login(@Body() body: LoginDto) {
    return this.auth.login(body.identifier, body.password, body.rememberMe ?? false);
  }

  @Post('browser/login')
  @ApiBody({ type: LoginDto })
  @HttpCode(200)
  async browserLogin(@Body() body: LoginDto, @Res({ passthrough: true }) response: BrowserResponse) {
    const session = await this.auth.login(body.identifier, body.password, body.rememberMe ?? false);
    const csrfToken = randomBytes(32).toString('base64url');
    setBrowserCookies(response, session, csrfToken);
    return { user: session.user, csrfToken, expiresIn: session.expiresIn };
  }

  @Post('browser/refresh')
  @HttpCode(200)
  async browserRefresh(@Req() request: BrowserRequest, @Res({ passthrough: true }) response: BrowserResponse) {
    const refreshToken = readCookie(request.headers.cookie, REFRESH_COOKIE);
    if (!refreshToken) throw new UnauthorizedException('Session invalide ou expirée.');
    const session = await this.auth.refresh(refreshToken);
    const csrfToken = randomBytes(32).toString('base64url');
    setBrowserCookies(response, session, csrfToken);
    return { user: session.user, csrfToken, expiresIn: session.expiresIn };
  }

  @Get('browser/me')
  @UseGuards(AccessTokenGuard)
  async browserMe(@Req() request: BrowserRequest) {
    return {
      user: await this.auth.getBrowserIdentity(request.auth.user.id),
      csrfToken: readCookie(request.headers.cookie, CSRF_COOKIE) ?? null,
    };
  }

  @Post('browser/logout')
  @HttpCode(200)
  async browserLogout(@Req() request: BrowserRequest, @Res({ passthrough: true }) response: BrowserResponse) {
    const refreshToken = readCookie(request.headers.cookie, REFRESH_COOKIE);
    if (refreshToken) await this.auth.revokeRefreshToken(refreshToken);
    response.setHeader('Set-Cookie', clearSessionCookies());
    return { status: 'ok' as const };
  }

  @Post('refresh')
  @ApiBody({ type: RefreshSessionDto })
  @HttpCode(200)
  refresh(@Body() body: RefreshSessionDto) {
    return this.auth.refresh(body.refreshToken);
  }

  @Post('password-recovery')
  @ApiBody({ type: RequestPasswordResetDto })
  @HttpCode(202)
  async requestPasswordReset(@Body() body: RequestPasswordResetDto): Promise<{ status: 'accepted' }> {
    await this.auth.requestPasswordReset(body.email);
    return { status: 'accepted' };
  }

  @Post('password-reset')
  @ApiBody({ type: CompletePasswordResetDto })
  @HttpCode(204)
  async completePasswordReset(@Body() body: CompletePasswordResetDto): Promise<void> {
    await this.auth.completePasswordReset(body.token, body.newPassword);
  }

  @Get('me')
  @UseGuards(AccessTokenGuard)
  me(@Req() request: AuthenticatedRequest) {
    return request.auth.user;
  }

  @Post('logout')
  @HttpCode(200)
  async logout(@Body() body: RefreshSessionDto) {
    await this.auth.revokeRefreshToken(body.refreshToken);
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

function setBrowserCookies(
  response: BrowserResponse,
  session: { accessToken: string; refreshToken: string; expiresIn: number; refreshExpiresIn: number },
  csrfToken: string,
): void {
  response.setHeader('Set-Cookie', [
    serializeSessionCookie(ACCESS_COOKIE, session.accessToken, session.expiresIn),
    serializeSessionCookie(REFRESH_COOKIE, session.refreshToken, session.refreshExpiresIn),
    serializeSessionCookie(CSRF_COOKIE, csrfToken, session.refreshExpiresIn, false),
  ]);
}
