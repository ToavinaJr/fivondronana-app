import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { resolveApiProxyTarget, resolveBackofficePort } from './src/server-port.ts';

const repositoryRoot = fileURLToPath(new URL('../..', import.meta.url));

export default defineConfig(({ mode }) => {
  const backofficeEnv = loadEnv(mode, repositoryRoot, 'BACKOFFICE_');
  const apiEnv = loadEnv(mode, repositoryRoot, 'API_');
  return {
    plugins: [react(), tailwindcss()],
    server: {
      host: '0.0.0.0',
      port: resolveBackofficePort(backofficeEnv.BACKOFFICE_URL),
      strictPort: true,
      proxy: { '/api': { target: resolveApiProxyTarget(apiEnv.API_PORT), changeOrigin: true } },
    },
  };
});
