import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { createIntegrationEnv } from './integration-config';

const root = resolve(import.meta.dir, '..');
let env: NodeJS.ProcessEnv;
try {
  env = createIntegrationEnv(process.env);
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Configuration de test invalide.');
  process.exit(1);
}

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
