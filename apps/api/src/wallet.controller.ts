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
    const existing = await this.prisma.payment.findUnique({ where: { idempotencyKey: key } });

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
      (await this.prisma.payment.create({
        data: {
          userId: user.id,
          type: 'DEPOSIT',
          amountCents: dto.amountCents,
          status: 'COMPLETED',
          providerReference: `mock_${key}`,
          idempotencyKey: key,
        },
      }));

    await this.wallet.apply(
      user.id,
      dto.amountCents,
      'DEPOSIT',
      `payment:${payment.id}`,
      payment.id,
    );

    return { paymentId: payment.id, ...(await this.wallet.balance(user.id)) };
  }

  @Post('mock-withdrawal')
  async withdraw(
    @Req() req: Request,
    @Body() dto: AmountDto,
    @Headers('idempotency-key') rawKey?: string,
  ) {
    const user = await this.current.require(req);
    const key = requireIdempotencyKey(rawKey);
    const existing = await this.prisma.payment.findUnique({ where: { idempotencyKey: key } });

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
      (await this.prisma.payment.create({
        data: {
          userId: user.id,
          type: 'WITHDRAWAL',
          amountCents: dto.amountCents,
          status: 'COMPLETED',
          providerReference: `mock_${key}`,
          idempotencyKey: key,
        },
      }));

    await this.wallet.apply(
      user.id,
      -dto.amountCents,
      'WITHDRAWAL',
      `payment:${payment.id}`,
      payment.id,
    );

    return { paymentId: payment.id, ...(await this.wallet.balance(user.id)) };
  }
}
