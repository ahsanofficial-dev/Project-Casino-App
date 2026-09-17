import { Controller, Get } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Controller('events')
export class EventsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list() {
    return this.prisma.event.findMany({
      where: { status: 'OPEN', startsAt: { gt: new Date() } },
      orderBy: { startsAt: 'asc' },
      include: { markets: { include: { selections: true } } },
    });
  }
}
