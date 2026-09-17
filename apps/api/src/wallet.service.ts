import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class WalletService {
  constructor(private readonly prisma: PrismaClient = new PrismaClient()) {}
  async applyLedgerEntry(userId: string, amountCents: number, type: any, idempotencyKey: string, referenceId?: string) {
    if (!Number.isSafeInteger(amountCents) || amountCents === 0) throw new BadRequestException('Invalid minor-unit amount');
    return this.prisma.$transaction(async tx => {
      const existing = await tx.ledgerEntry.findUnique({ where: { idempotencyKey } });
      if (existing) return existing;
      const wallet = await tx.wallet.findUnique({ where: { userId } });
      if (!wallet) throw new BadRequestException('Wallet not found');
      if (wallet.balanceCents + amountCents < 0) throw new BadRequestException('Insufficient balance');
      await tx.wallet.update({ where: { userId }, data: { balanceCents: { increment: amountCents } } });
      return tx.ledgerEntry.create({ data: { userId, amountCents, type, idempotencyKey, referenceId } });
    });
  }
}
