import { defineConfig } from 'vitest/config'

// Configuración exclusiva para tests de integración.
// Requiere PostgreSQL + Redis corriendo (ver docker-compose.test.yml).
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.integration.test.ts'],
    // Cargar .env local (DATABASE_URL, JWT_SECRET, etc.)
    env: {
      // Los valores del .env de la API se cargan via dotenv en server.ts,
      // pero en tests necesitamos inyectarlos aquí directamente.
    },
    // Tests de integración corren en serie para evitar conflictos de DB
    pool: 'forks',
    poolOptions: {
      forks: { singleFork: true },
    },
    // Timeout más alto por latencia de red con la DB
    testTimeout: 30000,
    hookTimeout: 30000,
    // Cargar variables de entorno desde el .env de la API
    setupFiles: ['dotenv/config'],
    // Sobreescribir límites de rate limiting para tests (dotenv no sobreescribe vars ya definidas)
    env: {
      RATE_LIMIT_MAX: '10000',
      AUTH_RATE_LIMIT_MAX: '10000',
      RATE_LIMIT_WINDOW_MS: '900000',
    },
  },
})
