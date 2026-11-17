import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const root = resolve(import.meta.dir, '..');
const connectionString = process.env.DATABASE_URL_TEST;

if (!connectionString) {
  console.error('DATABASE_URL_TEST doit pointer vers une base PostgreSQL de test dédiée.');
  process.exit(1);
}

let databaseName: string;
try {
  const url = new URL(connectionString);
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) throw new Error('Unsupported protocol');
  databaseName = decodeURIComponent(url.pathname.replace(/^\//, ''));
} catch {
  console.error('DATABASE_URL_TEST doit être une URL PostgreSQL valide.');
  process.exit(1);
}

if (!databaseName.toLowerCase().endsWith('_test')) {
  console.error('Refus de migrer : le nom de la base DATABASE_URL_TEST doit se terminer par _test.');
  process.exit(1);
}

const env = { ...process.env, DATABASE_URL: connectionString, NODE_ENV: 'test' };
const commands: Array<[string, string[]]> = [
  ['Génération Prisma', ['run', '--filter', '@fivondronana/api', 'db:generate']],
  ['Migrations de la base de test', ['run', 'db:deploy']],
  ['Tests API/PostgreSQL', ['run', '--filter', '@fivondronana/api', 'test:integration']],
];

for (const [label, args] of commands) {
  const result = spawnSync(process.execPath, args, { cwd: root, env, stdio: 'inherit' });
  if (result.error || result.status !== 0) {
    console.error(`${label} a échoué${result.error ? ` : ${result.error.message}` : '.'}`);
    process.exit(result.status ?? 1);
  }
}
