import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { hashPassword } from '../src/modules/auth/auth.crypto.js';

const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
const accountName = process.env.BOOTSTRAP_ADMIN_NAME?.trim();
const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
const connectionString = process.env.DATABASE_URL;

if (process.env.NODE_ENV !== 'production' && process.env.APP_ENV !== 'production') {
  throw new Error('First administrator bootstrap is allowed only when NODE_ENV or APP_ENV is production.');
}
if (process.env.BOOTSTRAP_ADMIN_CONFIRM !== 'YES') {
  throw new Error('Set BOOTSTRAP_ADMIN_CONFIRM=YES to confirm first administrator creation.');
}
if (!connectionString) throw new Error('DATABASE_URL must be set.');
if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  throw new Error('BOOTSTRAP_ADMIN_EMAIL must be a valid email address.');
}
if (!accountName) throw new Error('BOOTSTRAP_ADMIN_NAME must not be empty.');
if (!password || password.length < 12) {
  throw new Error('BOOTSTRAP_ADMIN_PASSWORD must contain at least 12 characters.');
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

try {
  const passwordHash = await hashPassword(password);
  await prisma.$transaction(async (transaction) => {
    // Serialize bootstrap attempts so two simultaneous runs cannot both pass the empty-table check.
    await transaction.$queryRaw`SELECT pg_advisory_xact_lock(731904261)`;

    const userCount = await transaction.user.count();
    if (userCount !== 0) {
      throw new Error(`Bootstrap refused: the database already contains ${userCount} user(s).`);
    }

    await transaction.user.create({
      data: {
        accountName,
        email,
        emailNormalized: email,
        passwordHash,
        isActive: true,
        roles: { create: { role: 'ADMINISTRATOR' } },
      },
    });
  });

  console.log(`First administrator created for ${email}.`);
} finally {
  await prisma.$disconnect();
}
