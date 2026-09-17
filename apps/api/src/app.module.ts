import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { BetsController } from './bets.controller';
import { CurrentUser } from './current-user';
import { EventsController } from './events.controller';
import { PrismaService } from './prisma.service';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';
@Module({ controllers: [AuthController, EventsController, WalletController, BetsController], providers: [PrismaService, AuthService, CurrentUser, WalletService] })
export class AppModule {}
