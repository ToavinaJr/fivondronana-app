import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { networkInterfaces } from 'node:os';
import { resolve } from 'node:path';

const root = resolve(import.meta.dir, '..');
const database = spawnSync(
  'docker',
  ['compose', '--env-file', '.env', '-f', 'infra/docker-compose.yml', 'up', '-d', '--wait', 'postgres'],
  { cwd: root, stdio: 'inherit' },
);

if (database.error || database.status !== 0) {
  console.error('Impossible de démarrer PostgreSQL. Vérifiez Docker puis lancez bun run db:up.');
  process.exit(database.status ?? 1);
}

const commands: Array<[string, string[]]> = [
  ['API', ['run', '--filter', '@fivondronana/api', 'start:dev']],
  ['Expo', ['run', 'expo', 'start', '--host', 'lan']],
];
const children: ChildProcess[] = [];
let stopping = false;

function getLanIpv4(): string | undefined {
  const interfaces = networkInterfaces();
  const entries = Object.entries(interfaces).flatMap(([name, addresses]) =>
    (addresses ?? [])
      .filter((address) => address.family === 'IPv4' && !address.internal && !address.address.startsWith('169.254.'))
      .map((address) => ({ name, address: address.address })),
  );
  return entries.find(({ name }) => /wi-?fi|ethernet/i.test(name))?.address ?? entries[0]?.address;
}

function stopAll(exitCode = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) if (child.exitCode === null) child.kill('SIGTERM');
  if (exitCode !== 0) process.exitCode = exitCode;
}

for (const [name, args] of commands) {
  const cwd = name === 'Expo' ? resolve(root, 'apps/mobile') : root;
  const env = { ...process.env };
  if (name === 'Expo') {
    const lanIp = getLanIpv4();
    if (lanIp) {
      env.REACT_NATIVE_PACKAGER_HOSTNAME = lanIp;
      env.EXPO_PUBLIC_API_URL = `http://${lanIp}:3001/api`;
    } else {
      console.warn('Aucune adresse IPv4 LAN détectée. Le téléphone devra pouvoir résoudre EXPO_PUBLIC_API_URL.');
    }
  }
  const child = spawn(process.execPath, args, { cwd, stdio: 'inherit', env });
  children.push(child);
  child.on('error', (error) => {
    console.error(`${name} n’a pas pu démarrer : ${error.message}`);
    stopAll(1);
  });
  child.on('exit', (code) => {
    if (!stopping) {
      console.log(`${name} s’est arrêté.`);
      stopAll(code ?? 1);
    }
  });
}

process.on('SIGINT', () => stopAll());
process.on('SIGTERM', () => stopAll());
