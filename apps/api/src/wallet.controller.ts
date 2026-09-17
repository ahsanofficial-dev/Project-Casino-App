import { BadRequestException, Body, Controller, Get, Headers, Post, Req } from '@nestjs/common';
import { IsInt, Min } from 'class-validator';
import type { Request } from 'express';
import { CurrentUser } from './current-user';
import { PrismaService } from './prisma.service';
import { requireIdempotencyKey } from './request-validation';
import { WalletService } from './wallet.service';

class AmountDto {
  @IsInt()
  @Min(100)
  amountCents!: number;
}

@Controller('wallet')
export class WalletController {
  constructor(
    private readonly current: CurrentUser,
    private readonly wallet: WalletService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  async get(@Req() req: Request) {
    const user = await this.current.require(req);
    return this.wallet.balance(user.id);
  }

  @Post('mock-deposit')
  async deposit(
    @Req() req: Request,
    @Body() dto: AmountDto,
    @Headers('idempotency-key') rawKey?: string,
  ) {
    const user = await this.current.require(req);
    const key = requireIdempotencyKey(rawKey);

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.payment.findUnique({ where: { idempotencyKey: key } });

      if (
        existing &&
        (existing.userId !== user.id ||
          existing.amountCents !== dto.amountCents ||
          existing.type !== 'DEPOSIT')
      ) {
        throw new BadRequestException('Idempotency key was already used');
      }

      const payment =
        existing ??
        (await tx.payment.create({
          data: {
            userId: user.id,
            type: 'DEPOSIT',
            amountCents: dto.amountCents,
            status: 'COMPLETED',
            providerReference: `mock_${key}`,
            idempotencyKey: key,
          },
        }));

      // Ledger idempotency is keyed off payment id so retries are safe
      const ledgerKey = `payment:${payment.id}`;
      const existingLedger = await tx.ledgerEntry.findUnique({ where: { idempotencyKey: ledgerKey } });

      if (!existingLedger) {
        const updated = await tx.wallet.updateMany({
          where: { userId: user.id },
          data: { balanceCents: { increment: dto.amountCents } },
        });
        if (updated.count !== 1) {
          throw new BadRequestException('Wallet not found');
        }

        await tx.ledgerEntry.create({
          data: {
            userId: user.id,
            amountCents: dto.amountCents,
            type: 'DEPOSIT',
            idempotencyKey: ledgerKey,
            referenceId: payment.id,
          },
        });
      }

      const balance = await tx.wallet.findUniqueOrThrow({
        where: { userId: user.id },
        select: { balanceCents: true, pendingCents: true },
      });

      return { paymentId: payment.id, ...balance };
    });
  }

  @Post('mock-withdrawal')
  async withdraw(
    @Req() req: Request,
    @Body() dto: AmountDto,
    @Headers('idempotency-key') rawKey?: string,
  ) {
    const user = await this.current.require(req);
    const key = requireIdempotencyKey(rawKey);

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.payment.findUnique({ where: { idempotencyKey: key } });

      if (
        existing &&
        (existing.userId !== user.id ||
          existing.amountCents !== dto.amountCents ||
          existing.type !== 'WITHDRAWAL')
      ) {
        throw new BadRequestException('Idempotency key was already used');
      }

      const payment =
        existing ??
        (await tx.payment.create({
          data: {
            userId: user.id,
            type: 'WITHDRAWAL',
            amountCents: dto.amountCents,
            status: 'COMPLETED',
            providerReference: `mock_${key}`,
            idempotencyKey: key,
          },
        }));

      const ledgerKey = `payment:${payment.id}`;
      const existingLedger = await tx.ledgerEntry.findUnique({ where: { idempotencyKey: ledgerKey } });

      if (!existingLedger) {
        const updated = await tx.wallet.updateMany({
          where: { userId: user.id, balanceCents: { gte: dto.amountCents } },
          data: { balanceCents: { decrement: dto.amountCents } },
        });
        if (updated.count !== 1) {
          throw new BadRequestException('Insufficient balance');
        }

        await tx.ledgerEntry.create({
          data: {
            userId: user.id,
            amountCents: -dto.amountCents,
            type: 'WITHDRAWAL',
            idempotencyKey: ledgerKey,
            referenceId: payment.id,
          },
        });
      }

      const balance = await tx.wallet.findUniqueOrThrow({
        where: { userId: user.id },
        select: { balanceCents: true, pendingCents: true },
      });

      return { paymentId: payment.id, ...balance };
    });
  }
}
