import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { createServer } from 'node:net';
import { resolve } from 'node:path';
import { createIntegrationEnv } from './integration-config';

const root = resolve(import.meta.dir, '..');
const composeFile = resolve(root, 'infra/docker-compose.test.yml');
const project = `fivondronana-test-${randomBytes(8).toString('hex')}`;
const password = randomBytes(32).toString('base64url');
const port = await findFreePort();
const clamavPort = await findFreePort();
const databaseUrl = `postgresql://fivondronana_test:${password}@127.0.0.1:${port}/fivondronana_test?schema=public`;
const env = createIntegrationEnv({
  ...process.env,
  DATABASE_URL_TEST: databaseUrl,
  APP_ENV: 'test',
  CLAMAV_HOST: '127.0.0.1',
  CLAMAV_PORT: String(clamavPort),
});
const dockerEnv = {
  ...env,
  POSTGRES_TEST_PASSWORD: password,
  POSTGRES_TEST_PORT: String(port),
  CLAMAV_TEST_PORT: String(clamavPort),
};
const compose = ['compose', '-f', composeFile, '-p', project];
let exitCode = 0;

try {
  exitCode = run('Démarrage de la base PostgreSQL de test éphémère', 'docker', [...compose, 'up', '-d', '--wait'], {
    ...dockerEnv,
  });
  if (exitCode === 0) {
    const commands: Array<[string, string[]]> = [
      ['Génération Prisma', ['run', '--filter', '@fivondronana/api', 'db:generate']],
      ['Migrations de la base isolée', ['run', 'db:deploy']],
      ['Toutes les suites API et PostgreSQL', ['run', '--filter', '@fivondronana/api', 'test:integration']],
    ];
    for (const [label, args] of commands) {
      exitCode = run(label, process.execPath, args, env);
      if (exitCode !== 0) break;
    }
  }
} finally {
  const teardown = run(
    'Nettoyage du projet PostgreSQL temporaire dédié',
    'docker',
    [...compose, 'down', '--volumes', '--remove-orphans'],
    dockerEnv,
  );
  if (exitCode === 0 && teardown !== 0) exitCode = teardown;
}

process.exit(exitCode);

function run(label: string, command: string, args: string[], commandEnv: NodeJS.ProcessEnv): number {
  console.log(label);
  const result = spawnSync(command, args, { cwd: root, env: commandEnv, stdio: 'inherit' });
  if (result.error || result.status !== 0) {
    console.error(`${label} a échoué${result.error ? ` : ${result.error.message}` : '.'}`);
    return result.status ?? 1;
  }
  return 0;
}

async function findFreePort(): Promise<number> {
  const server = createServer();
  await new Promise<void>((resolveListen, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolveListen);
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Impossible de réserver un port local de test.');
  const port = address.port;
  await new Promise<void>((resolveClose, reject) => server.close((error) => (error ? reject(error) : resolveClose())));
  return port;
}
