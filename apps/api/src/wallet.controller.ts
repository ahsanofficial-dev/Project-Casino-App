import { BadRequestException, Body, Controller, Get, Headers, Post, Req } from '@nestjs/common';
import { IsInt, Min } from 'class-validator';
import type { Request } from 'express';
import { CurrentUser } from './current-user';
import { PrismaService } from './prisma.service';
import { WalletService } from './wallet.service';
class AmountDto { @IsInt() @Min(100) amountCents!: number; }
@Controller('wallet')
export class WalletController {
  constructor(private readonly current: CurrentUser, private readonly wallet: WalletService, private readonly prisma: PrismaService) {}
  @Get() async get(@Req() req: Request) { return this.wallet.balance((await this.current.require(req)).id); }
  @Post('mock-deposit') async deposit(@Req() req: Request, @Body() dto: AmountDto, @Headers('idempotency-key') key?: string) {
    const u = await this.current.require(req); if (!key) throw new BadRequestException('Idempotency-Key is required');
    const existing = await this.prisma.payment.findUnique({ where: { idempotencyKey: key } });
    if (existing && (existing.userId !== u.id || existing.amountCents !== dto.amountCents || existing.type !== 'DEPOSIT')) throw new BadRequestException('Idempotency key was already used');
    const payment = existing ?? await this.prisma.payment.create({ data: { userId: u.id, type: 'DEPOSIT', amountCents: dto.amountCents, status: 'COMPLETED', providerReference: `mock_${key}`, idempotencyKey: key } });
    await this.wallet.apply(u.id, dto.amountCents, 'DEPOSIT', `payment:${payment.id}`, payment.id);
    return { paymentId: payment.id, ...(await this.wallet.balance(u.id)) };
  }
  @Post('mock-withdrawal') async withdraw(@Req() req: Request, @Body() dto: AmountDto, @Headers('idempotency-key') key?: string) {
    const u = await this.current.require(req); if (!key) throw new BadRequestException('Idempotency-Key is required');
    const payment = await this.prisma.payment.upsert({ where: { idempotencyKey: key }, update: {}, create: { userId: u.id, type: 'WITHDRAWAL', amountCents: dto.amountCents, status: 'COMPLETED', providerReference: `mock_${key}`, idempotencyKey: key } });
    if (payment.userId !== u.id || payment.amountCents !== dto.amountCents || payment.type !== 'WITHDRAWAL') throw new BadRequestException('Idempotency key was already used');
    await this.wallet.apply(u.id, -dto.amountCents, 'WITHDRAWAL', `payment:${payment.id}`, payment.id);
    return { paymentId: payment.id, ...(await this.wallet.balance(u.id)) };
  }
}
