import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { hashPassword } from '../src/modules/auth/auth.crypto.js';
import { assertDemoSeedAllowed, requireDemoDatabaseUrl } from './demo-seed-config.js';

assertDemoSeedAllowed(process.env);
const connectionString = requireDemoDatabaseUrl(process.env);

const email = 'demo@fivondronana.test';
const password = 'FivondronanaDemo2026!';
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

try {
  const passwordHash = await hashPassword(password);
  const user = await prisma.user.upsert({
    where: { emailNormalized: email },
    create: {
      accountName: 'Responsable démo',
      email,
      emailNormalized: email,
      phone: null,
      phoneNormalized: null,
      passwordHash,
      isActive: true,
    },
    update: { accountName: 'Responsable démo', passwordHash, isActive: true },
  });
  const entities = await Promise.all(
    ['Mavo', 'Maitso', 'Mena', 'Menafify'].map((name) =>
      prisma.entity.upsert({ where: { name }, create: { name }, update: {} }),
    ),
  );
  const groups = await Promise.all(
    entities.flatMap((entity) =>
      ['Tily', 'Mpanazava'].map((name) =>
        prisma.group.upsert({
          where: { entityId_name: { entityId: entity.id, name } },
          create: { entityId: entity.id, name },
          update: { isActive: true },
        }),
      ),
    ),
  );
  const demoGroup = groups.find((group) => group.entityId === entities[0].id && group.name === 'Tily');
  if (!demoGroup) throw new Error('Unable to create the demo membership group.');
  const responsibilities = await Promise.all(
    ['Haim-panahy', 'Fampitaovana', 'Mpitantsoratra', 'Mpitahiry vola'].map((name) =>
      prisma.officialResponsibility.upsert({ where: { name }, create: { name }, update: { isActive: true } }),
    ),
  );
  await prisma.$transaction([
    prisma.userRole.upsert({
      where: { userId_role: { userId: user.id, role: 'RESPONSIBLE' } },
      create: { userId: user.id, role: 'RESPONSIBLE' },
      update: {},
    }),
    prisma.entityMembership.upsert({
      where: { userId: user.id },
      create: { userId: user.id, entityId: entities[0].id, groupId: demoGroup.id },
      update: { entityId: entities[0].id, groupId: demoGroup.id },
    }),
    prisma.userResponsibility.upsert({
      where: { userId_responsibilityId: { userId: user.id, responsibilityId: responsibilities[0].id } },
      create: { userId: user.id, responsibilityId: responsibilities[0].id },
      update: {},
    }),
  ]);
  console.log(`Compte de démonstration prêt : ${email}`);
} finally {
  await prisma.$disconnect();
}
