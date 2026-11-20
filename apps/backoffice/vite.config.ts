import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { resolveBackofficePort } from './src/server-port.ts';

const repositoryRoot = fileURLToPath(new URL('../..', import.meta.url));

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, repositoryRoot, 'BACKOFFICE_');
  return {
    plugins: [react()],
    server: {
      host: '0.0.0.0',
      port: resolveBackofficePort(env.BACKOFFICE_URL),
      strictPort: true,
      proxy: { '/api': { target: 'http://localhost:3000', changeOrigin: true } },
    },
  };
});
