import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const events = [
    { home: 'Manchester Reds', away: 'London Blues', hours: 3 },
    { home: 'LA Waves', away: 'Boston Celts', hours: 5 },
  ];
  for (const e of events) {
    const event = await prisma.event.create({ data: { home: e.home, away: e.away, startsAt: new Date(Date.now() + e.hours * 3600000), markets: { create: { name: 'Match Winner', selections: { create: [{ name: e.home, odds: 1.85 }, { name: e.away, odds: 2.1 }] } } } } });
    console.log(`seeded ${event.home} vs ${event.away}`);
  }
}
main().finally(() => prisma.$disconnect());
