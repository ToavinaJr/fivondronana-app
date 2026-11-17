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
  await prisma.user.upsert({
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
  console.log(`Compte de démonstration prêt : ${email}`);
  console.log(`Mot de passe de démonstration : ${password}`);
} finally {
  await prisma.$disconnect();
}
