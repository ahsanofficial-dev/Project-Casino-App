import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Injectable()
export class WalletService {
  constructor(private readonly prisma: PrismaService) {}
  async balance(userId: string) {
    return this.prisma.wallet.findUniqueOrThrow({ where: { userId }, select: { balanceCents: true, pendingCents: true } });
  }
  async apply(userId: string, amountCents: number, type: 'DEPOSIT'|'BET_STAKE'|'BET_PAYOUT'|'WITHDRAWAL'|'WITHDRAWAL_REVERSAL'|'BONUS', idempotencyKey: string, referenceId?: string) {
    if (!Number.isSafeInteger(amountCents) || amountCents === 0) throw new BadRequestException('Amount must be a non-zero integer in cents');
    return this.prisma.$transaction(async tx => {
      const existing = await tx.ledgerEntry.findUnique({ where: { idempotencyKey } });
      if (existing) {
        if (existing.userId !== userId || existing.amountCents !== amountCents || existing.type !== type) throw new ConflictException('Idempotency key was already used for another operation');
        return existing;
      }
      const wallet = await tx.wallet.findUnique({ where: { userId } });
      if (!wallet) throw new NotFoundException('Wallet not found');
      const updated = await tx.wallet.updateMany({ where: { userId, balanceCents: { gte: amountCents < 0 ? -amountCents : 0 } }, data: { balanceCents: { increment: amountCents } } });
      if (updated.count !== 1) throw new BadRequestException('Insufficient balance');
      return tx.ledgerEntry.create({ data: { userId, amountCents, type, idempotencyKey, referenceId } });
    });
  }
}
