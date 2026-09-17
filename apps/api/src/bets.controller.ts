import { BadRequestException, Body, Controller, Headers, Post, Req } from '@nestjs/common';
import { IsInt, IsString, Min } from 'class-validator';
import type { Request } from 'express';
import { CurrentUser } from './current-user';
import { PrismaService } from './prisma.service';
import { WalletService } from './wallet.service';
class PlaceBetDto { @IsString() selectionId!: string; @IsInt() @Min(100) stakeCents!: number; }
@Controller('bets')
export class BetsController {
  constructor(private readonly current: CurrentUser, private readonly prisma: PrismaService, private readonly wallet: WalletService) {}
  @Post() async place(@Req() req: Request, @Body() dto: PlaceBetDto, @Headers('idempotency-key') key?: string) {
    const u = await this.current.require(req); if (!key) throw new BadRequestException('Idempotency-Key is required');
    return this.prisma.$transaction(async tx => {
      const existing = await tx.bet.findUnique({ where: { idempotencyKey: key }, include: { selections: true } }); if (existing) return existing;
      const selection = await tx.selection.findUnique({ where: { id: dto.selectionId }, include: { market: { include: { event: true } } } });
      if (!selection || selection.market.event.status !== 'OPEN' || selection.market.event.startsAt <= new Date()) throw new BadRequestException('Selection is unavailable');
      const odds = Number(selection.odds); const potential = Math.floor(dto.stakeCents * odds);
      const wallet = await tx.wallet.findUnique({ where: { userId: u.id } }); if (!wallet || wallet.balanceCents < dto.stakeCents) throw new BadRequestException('Insufficient balance');
      const bet = await tx.bet.create({ data: { userId: u.id, stakeCents: dto.stakeCents, combinedOdds: selection.odds, potentialReturnCents: potential, idempotencyKey: key, selections: { create: { eventId: selection.market.eventId, selectionId: selection.id, odds: selection.odds } } }, include: { selections: true } });
      await tx.wallet.update({ where: { userId: u.id }, data: { balanceCents: { decrement: dto.stakeCents } } });
      await tx.ledgerEntry.create({ data: { userId: u.id, amountCents: -dto.stakeCents, type: 'BET_STAKE', idempotencyKey: `bet:${bet.id}`, referenceId: bet.id } });
      return bet;
    });
  }
}
