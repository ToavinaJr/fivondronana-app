import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { createIntegrationEnv } from './integration-config';

const root = resolve(import.meta.dir, '..');
const composeFile = resolve(root, 'infra/docker-compose.test.yml');
let env: NodeJS.ProcessEnv;
try {
  env = createIntegrationEnv(process.env);
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Configuration de test invalide.');
  process.exit(1);
}

function run(label: string, command: string, args: string[]): void {
  const result = spawnSync(command, args, { cwd: root, env, stdio: 'inherit' });
  if (result.error || result.status !== 0) {
    throw new Error(`${label} a échoué${result.error ? ` : ${result.error.message}` : '.'}`);
  }
}

let exitCode = 0;
try {
  run('Démarrage de la base PostgreSQL de test isolée', 'docker', [
    'compose',
    '-f',
    composeFile,
    'up',
    '-d',
    '--wait',
    'postgres-test',
  ]);
  run('Génération Prisma', process.execPath, ['run', '--filter', '@fivondronana/api', 'db:generate']);
  run('Migrations de la base de test', process.execPath, ['run', 'db:deploy']);
  run('Tests API/PostgreSQL', process.execPath, ['run', '--filter', '@fivondronana/api', 'test:integration']);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  exitCode = 1;
} finally {
  const teardown = spawnSync('docker', ['compose', '-f', composeFile, 'down', '-v'], {
    cwd: root,
    env,
    stdio: 'inherit',
  });
  if (teardown.status !== 0 && exitCode === 0) exitCode = teardown.status ?? 1;
}

process.exit(exitCode);
