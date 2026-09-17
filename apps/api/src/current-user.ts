import { Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service';
const COOKIE = 'casino_session';
@Injectable()
export class CurrentUser {
  constructor(private readonly auth: AuthService) {}
  async require(req: Request) { const user = await this.auth.fromToken(req.cookies?.[COOKIE]); if (!user) throw new UnauthorizedException('Authentication required'); return user; }
}
