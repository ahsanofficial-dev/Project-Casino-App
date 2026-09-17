import { BadRequestException, Controller, Get, Param, Req } from '@nestjs/common';
import type { Request } from 'express';
import { CurrentUser } from './current-user';
import { PrismaService } from './prisma.service';
@Controller('bets')
export class BetsQueryController {
  constructor(private readonly current: CurrentUser, private readonly prisma: PrismaService) {}
  @Get() async list(@Req() req: Request) { const user = await this.current.require(req); return this.prisma.bet.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, take: 100, include: { selections: true } }); }
  @Get(':id') async get(@Req() req: Request, @Param('id') id: string) { const user = await this.current.require(req); const bet = await this.prisma.bet.findFirst({ where: { id, userId: user.id }, include: { selections: true } }); if (!bet) throw new BadRequestException('Bet not found'); return bet; }
}
