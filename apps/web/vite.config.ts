import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      {
        find: '@splitmate/shared',
        replacement: path.resolve(__dirname, '../../packages/shared/src/index.ts'),
      },
      {
        find: /^@\//,
        replacement: path.resolve(__dirname, './src') + '/',
      },
    ],
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
