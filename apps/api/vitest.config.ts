import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    exclude: ['**/node_modules/**', '**/dist/**', '**/*.integration.test.ts'],
    env: {
      DATABASE_URL: 'postgresql://test:test@localhost:5432/splitmate_test',
      REDIS_URL: 'redis://localhost:6379',
      JWT_SECRET: 'test-secret-for-unit-tests-only-not-production',
      JWT_EXPIRES_IN: '15m',
      REFRESH_TOKEN_EXPIRES_DAYS: '7',
      NODE_ENV: 'test',
      PORT: '3000',
      CORS_ORIGIN: 'http://localhost:5173',
      RATE_LIMIT_WINDOW_MS: '900000',
      RATE_LIMIT_MAX: '100',
      GOOGLE_CLIENT_ID: 'test-client-id',
      GOOGLE_CLIENT_SECRET: 'test-client-secret',
      GOOGLE_CALLBACK_URL: 'http://localhost:3000/api/v1/auth/google/callback',
      FRONTEND_URL: 'http://localhost:5173',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      thresholds: {
        'src/slices/balances/**': { lines: 90 },
        'src/slices/expenses/**': { lines: 80 },
      },
    },
  },
})
