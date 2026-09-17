import { Body, Controller, Get, Headers, Post, Req } from '@nestjs/common';
import { IsInt, IsString, Min } from 'class-validator';
import type { Request } from 'express';
import { CurrentUser } from './current-user';
import { PrismaService } from './prisma.service';
import { WalletService } from './wallet.service';
class DepositDto { @IsInt() @Min(100) amountCents!: number; }
@Controller('wallet')
export class WalletController {
  constructor(private readonly current: CurrentUser, private readonly wallet: WalletService, private readonly prisma: PrismaService) {}
  @Get() async get(@Req() req: Request) { const u = await this.current.require(req); return this.wallet.balance(u.id); }
  @Post('mock-deposit') async deposit(@Req() req: Request, @Body() dto: DepositDto, @Headers('idempotency-key') key?: string) { const u = await this.current.require(req); if (!key) throw new Error('Idempotency-Key is required'); const payment = await this.prisma.payment.upsert({ where: { idempotencyKey: key }, update: {}, create: { userId: u.id, type: 'DEPOSIT', amountCents: dto.amountCents, status: 'COMPLETED', providerReference: `mock_${key}`, idempotencyKey: key } }); await this.wallet.apply(u.id, dto.amountCents, 'DEPOSIT', `payment:${payment.id}`, payment.id); return { paymentId: payment.id, ...(await this.wallet.balance(u.id)) }; }
}
