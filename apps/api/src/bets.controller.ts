import { BadRequestException, Body, Controller, Headers, Post, Req } from '@nestjs/common';
import { IsInt, IsString, Min } from 'class-validator';
import type { Request } from 'express';
import { CurrentUser } from './current-user';
import { PrismaService } from './prisma.service';
import { requireIdempotencyKey } from './request-validation';

class PlaceBetDto {
  @IsString()
  selectionId!: string;

  @IsInt()
  @Min(100)
  stakeCents!: number;
}

@Controller('bets')
export class BetsController {
  constructor(private readonly current: CurrentUser, private readonly prisma: PrismaService) {}

  @Post()
  async place(@Req() req: Request, @Body() dto: PlaceBetDto, @Headers('idempotency-key') rawKey?: string) {
    const user = await this.current.require(req);
    const key = requireIdempotencyKey(rawKey);

    return this.prisma.$transaction(async tx => {
      const existing = await tx.bet.findUnique({
        where: { idempotencyKey: key },
        include: { selections: true },
      });
      if (existing) {
        if (
          existing.userId !== user.id ||
          existing.stakeCents !== dto.stakeCents ||
          existing.selections[0]?.selectionId !== dto.selectionId
        ) {
          throw new BadRequestException('Idempotency key was already used');
        }
        return existing;
      }

      const selection = await tx.selection.findUnique({
        where: { id: dto.selectionId },
        include: { market: { include: { event: true } } },
      });
      if (
        !selection ||
        selection.market.event.status !== 'OPEN' ||
        selection.market.event.startsAt <= new Date()
      ) {
        throw new BadRequestException('Selection is unavailable');
      }

      const odds = Number(selection.odds);
      if (!Number.isFinite(odds) || odds < 1) {
        throw new BadRequestException('Invalid odds');
      }

      const walletUpdate = await tx.wallet.updateMany({
        where: { userId: user.id, balanceCents: { gte: dto.stakeCents } },
        data: { balanceCents: { decrement: dto.stakeCents } },
      });
      if (walletUpdate.count !== 1) {
        throw new BadRequestException('Insufficient balance');
      }

      const bet = await tx.bet.create({
        data: {
          userId: user.id,
          stakeCents: dto.stakeCents,
          combinedOdds: selection.odds,
          potentialReturnCents: Math.floor(dto.stakeCents * odds),
          idempotencyKey: key,
          selections: {
            create: {
              eventId: selection.market.eventId,
              selectionId: selection.id,
              odds: selection.odds,
            },
          },
        },
        include: { selections: true },
      });

      await tx.ledgerEntry.create({
        data: {
          userId: user.id,
          amountCents: -dto.stakeCents,
          type: 'BET_STAKE',
          idempotencyKey: `bet:${bet.id}`,
          referenceId: bet.id,
        },
      });

      return bet;
    });
  }
}
