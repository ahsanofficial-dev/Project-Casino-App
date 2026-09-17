import { Body, Controller, Post, Req, Res, UnauthorizedException, Get } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto } from './auth.dto';

const COOKIE = 'casino_session';
const cookieOptions = { httpOnly: true, sameSite: 'lax' as const, secure: process.env.NODE_ENV === 'production', maxAge: 7 * 86400000, path: '/' };

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}
  @Post('register') register(@Body() dto: RegisterDto) { return this.auth.register(dto); }
  @Post('login') async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) { const user = await this.auth.authenticate(dto); res.cookie(COOKIE, await this.auth.createSession(user.id), cookieOptions); return { id: user.id, username: user.username, email: user.email }; }
  @Post('logout') async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) { await this.auth.revoke(req.cookies?.[COOKIE]); res.clearCookie(COOKIE, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/' }); return { ok: true }; }
  @Get('me') async me(@Req() req: Request) { const user = await this.auth.fromToken(req.cookies?.[COOKIE]); if (!user) throw new UnauthorizedException(); return user; }
}
