import { Controller, Get, Module } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
@Controller()
class HealthController {
  @Get('health') health() { return { status: 'ok', service: 'api', sandbox: true }; }
  @Get('api/events') async events() { return prisma.event.findMany({ where: { status: 'OPEN' }, include: { markets: { include: { selections: true } } } }); }
}
@Module({ controllers: [HealthController] })
export class AppModule {}
