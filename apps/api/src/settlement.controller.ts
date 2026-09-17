import { BadRequestException, Controller, Headers, Param, Post } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Controller('sandbox/settlement')
export class SettlementController {
  constructor(private readonly prisma: PrismaService) {}
  @Post(':betId/:outcome') async settle(@Param('betId') betId: string, @Param('outcome') outcome: 'WON'|'LOST'|'VOID', @Headers('x-sandbox-admin-key') key?: string) {
    if (!process.env.SANDBOX_ADMIN_KEY || key !== process.env.SANDBOX_ADMIN_KEY) throw new BadRequestException('Sandbox settlement authorization required');
    if (!['WON', 'LOST', 'VOID'].includes(outcome)) throw new BadRequestException('Invalid outcome');
    return this.prisma.$transaction(async tx => {
      const bet = await tx.bet.findUnique({ where: { id: betId } });
      if (!bet) throw new BadRequestException('Bet not found');
      if (bet.status !== 'OPEN') return bet;
      const payout = outcome === 'WON' ? bet.potentialReturnCents : outcome === 'VOID' ? bet.stakeCents : 0;
      const updated = await tx.bet.updateMany({ where: { id: betId, status: 'OPEN' }, data: { status: outcome, settledAt: new Date() } });
      if (updated.count !== 1) return tx.bet.findUniqueOrThrow({ where: { id: betId } });
      if (payout) {
        await tx.wallet.update({ where: { userId: bet.userId }, data: { balanceCents: { increment: payout } } });
        await tx.ledgerEntry.create({ data: { userId: bet.userId, amountCents: payout, type: outcome === 'VOID' ? 'WITHDRAWAL_REVERSAL' : 'BET_PAYOUT', idempotencyKey: `settlement:${bet.id}`, referenceId: bet.id } });
      }
      return tx.bet.findUniqueOrThrow({ where: { id: betId }, include: { selections: true } });
    });
  }
}
