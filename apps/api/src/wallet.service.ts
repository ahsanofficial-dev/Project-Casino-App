import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Injectable()
export class WalletService {
  constructor(private readonly prisma: PrismaService) {}
  async balance(userId: string) { return this.prisma.wallet.findUniqueOrThrow({ where: { userId }, select: { balanceCents: true, pendingCents: true } }); }
  async apply(userId: string, amountCents: number, type: 'DEPOSIT'|'BET_STAKE'|'BET_PAYOUT'|'WITHDRAWAL'|'BONUS', idempotencyKey: string, referenceId?: string) {
    if (!Number.isSafeInteger(amountCents) || amountCents === 0) throw new BadRequestException('Amount must be a non-zero integer in cents');
    return this.prisma.$transaction(async tx => {
      const existing = await tx.ledgerEntry.findUnique({ where: { idempotencyKey } });
      if (existing) return existing;
      const wallet = await tx.wallet.findUnique({ where: { userId } });
      if (!wallet || wallet.balanceCents + amountCents < 0) throw new BadRequestException('Insufficient balance');
      await tx.wallet.update({ where: { userId }, data: { balanceCents: { increment: amountCents } } });
      return tx.ledgerEntry.create({ data: { userId, amountCents, type, idempotencyKey, referenceId } });
    });
  }
}
