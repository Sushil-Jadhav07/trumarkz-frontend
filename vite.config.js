import { defineConfig, loadEnv } from 'vite';
import { firebaseMessagingWorker } from './build/firebaseMessagingWorker.js';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => ({
  plugins: [react(), firebaseMessagingWorker({ ...loadEnv(mode, process.cwd(), 'VITE_'), ...Object.fromEntries(Object.entries(process.env).filter(([key]) => key.startsWith('VITE_'))) })],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
}));
