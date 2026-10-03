import basicSsl from '@vitejs/plugin-basic-ssl';
import { defineConfig } from 'vitest/config';

export default defineConfig(({ mode }) => ({
  // GitHub Pages serves the site from /spokets-godisbus/ (plan §6.11).
  base: '/spokets-godisbus/',
  // `npm run dev:lan`: HTTPS with a self-signed certificate, so phones on the same Wi-Fi get a secure context.
  plugins: mode === 'lan' ? [basicSsl()] : [],
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 900,
  },
  test: {
    include: ['tests/{unit,sim,robot}/**/*.test.ts'],
    environment: 'node',
  },
}));
