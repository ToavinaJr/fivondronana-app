import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { hashPassword } from '../src/modules/auth/auth.crypto.js';

if (process.env['NODE_ENV'] === 'production' || process.env['APP_ENV'] === 'production') {
  throw new Error('The demo account seed is disabled in production.');
}

const connectionString = process.env['DATABASE_URL'];
if (!connectionString) throw new Error('DATABASE_URL must be set before creating the demo account.');

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
