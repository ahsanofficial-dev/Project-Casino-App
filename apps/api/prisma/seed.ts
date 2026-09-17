import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.$connect();

  const events = [
    {
      key: 'mock-football-001',
      home: 'Manchester Reds',
      away: 'London Blues',
      hours: 3,
      homeOdds: 1.85,
      awayOdds: 2.1,
    },
    {
      key: 'mock-basketball-001',
      home: 'LA Waves',
      away: 'Boston Celts',
      hours: 5,
      homeOdds: 1.72,
      awayOdds: 2.15,
    },
  ];

  for (const e of events) {
    const event = await prisma.event.upsert({
      where: { externalKey: e.key },
      update: {
        startsAt: new Date(Date.now() + e.hours * 3_600_000),
        status: 'OPEN',
      },
      create: {
        externalKey: e.key,
        home: e.home,
        away: e.away,
        startsAt: new Date(Date.now() + e.hours * 3_600_000),
        markets: {
          create: {
            name: 'Match Winner',
            selections: {
              create: [
                { name: e.home, odds: e.homeOdds },
                { name: e.away, odds: e.awayOdds },
              ],
            },
          },
        },
      },
    });
    console.log(`seeded ${event.home} vs ${event.away}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
