# SplitMate

> La forma más simple y clara de gestionar gastos compartidos.

Divide gastos con amigos, compañeros de piso, en viajes o en pareja. Crea un grupo, añade gastos, y deja que SplitMate calcule quién debe qué con el mínimo de transferencias posible.

[![CI](https://github.com/tu-usuario/splitmate/actions/workflows/ci.yml/badge.svg)](https://github.com/tu-usuario/splitmate/actions/workflows/ci.yml)

---

## Características

- **Grupos** — crea grupos y comparte el código de invitación
- **4 tipos de división** — igual, importe exacto, porcentaje y partes
- **Balance simplificado** — algoritmo greedy que minimiza el número de transferencias
- **Pagos manuales** — registra cuando alguien salda una deuda
- **Multi-idioma** — español e inglés
- **Dark/Light mode** — sistema, claro u oscuro
- **PWA** — installable en móvil, mobile-first

---

## Stack

| Área | Tecnología |
|------|-----------|
| Frontend | React 18 + Vite + TypeScript |
| UI | shadcn/ui + Tailwind CSS + Lucide |
| Estado | Zustand + TanStack Query |
| Backend | Node.js + Express + TypeScript |
| Validación | Zod (compartido FE+BE) |
| Base de datos | PostgreSQL 15 + Prisma ORM |
| Caché | Redis 7 |
| Autenticación | JWT (15min) + Refresh token (7d, httpOnly cookie) |
| Monorepo | Turborepo + pnpm workspaces |

---

## Inicio rápido (desarrollo)

**Requisitos:** Node 20+, pnpm 9, Docker Desktop

```bash
# 1. Instalar dependencias
pnpm install

# 2. Variables de entorno
cp .env.example apps/api/.env
# Editar apps/api/.env si es necesario (defaults funcionan con Docker)

# 3. Levantar base de datos y Redis
docker-compose up -d

# 4. Generar cliente Prisma y migrar
pnpm --filter @splitmate/api prisma:generate
pnpm --filter @splitmate/api prisma:migrate

# 5. Seed de datos de prueba (crea usuarios ana@dev.local y bob@dev.local, password: Password123)
pnpm --filter @splitmate/api prisma:seed

# 6. Arrancar en modo desarrollo
pnpm dev
```

| Servicio | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| API | http://localhost:3000 |
| Health check | http://localhost:3000/health |

---

## Estructura del monorepo

```
splitmate/
├── apps/
│   ├── api/          # Express API (Vertical Slice Architecture)
│   │   ├── src/
│   │   │   ├── slices/   # auth, groups, expenses, balances, payments…
│   │   │   └── shared/   # middleware, lib (prisma, redis, logger, cron)
│   │   └── prisma/       # schema, migrations, seed
│   └── web/          # React SPA (Vertical Slice Architecture)
│       └── src/
│           ├── slices/   # auth, groups, expenses, balances, profile
│           └── shared/   # components, hooks, lib, utils
└── packages/
    └── shared/       # Contratos Zod compartidos (FE + BE)
```

Cada slice es autónomo: `handler → service → repository`. Un slice no importa de otro.

---

## Comandos útiles

```bash
# Tests unitarios
pnpm test

# Tests de integración (requiere Docker corriendo)
pnpm --filter @splitmate/api test:integration

# Typecheck completo
pnpm turbo run typecheck

# Prisma Studio (interfaz visual de la DB)
pnpm --filter @splitmate/api prisma:studio

# Build de producción
pnpm build
```

---

## Tests

| Tipo | Archivos | Herramienta |
|------|---------|-------------|
| Unitarios (lógica pura) | `*.test.ts` | Vitest |
| Integración (endpoints reales) | `*.integration.test.ts` | Vitest + Supertest |
| E2E | `*.spec.ts` | Playwright |

Los tests de integración usan PostgreSQL real. Se ejecutan automáticamente en CI con un contenedor de servicio.

---

## CI/CD

El pipeline de GitHub Actions (`.github/workflows/ci.yml`) ejecuta en cada push/PR:

1. **check** — typecheck + tests unitarios (sin DB)
2. **integration** — tests de integración con PostgreSQL + Redis reales

---

## Deploy (Railway)

```bash
# El repositorio incluye railway.toml y apps/api/Dockerfile
# 1. Conectar el repo en railway.app → New Service → GitHub
# 2. Configurar las variables de entorno requeridas:
#    DATABASE_URL, REDIS_URL, JWT_SECRET, FRONTEND_URL,
#    CORS_ORIGIN, NODE_ENV=production
# 3. Railway ejecuta automáticamente: prisma migrate deploy → node dist/server.js
```

---

## Documentación técnica

| Documento | Descripción |
|-----------|-------------|
| [Arquitectura](docs/architecture/overview.md) | Visión general del sistema |
| [Estructura de carpetas](docs/architecture/folder-structure.md) | Geometría del proyecto |
| [Modelo de datos](docs/architecture/data-model.md) | Entidades y relaciones |
| [Contratos API](docs/api/contracts.md) | Endpoints y schemas |
| [ADR-001 — Stack](docs/architecture/decisions/ADR-001-stack.md) | Decisión de tecnologías |
| [ADR-004 — Balance runtime](docs/architecture/decisions/ADR-004-balance-runtime.md) | Por qué el balance no se persiste |
| [ADR-005 — Auth](docs/architecture/decisions/ADR-005-auth.md) | JWT + Refresh tokens |
| [Testing](docs/testing-guide.md) | Estrategia de calidad |
| [Onboarding](docs/onboarding.md) | Guía para nuevos desarrolladores |

---

## Estado del proyecto

| Fase | Estado |
|------|--------|
| Fase 0 — Descubrimiento | ✅ Completada |
| Fase 1 — Arquitectura | ✅ Completada |
| Fase 2 — MVP (código) | ✅ Completada |
| Fase 3 — Hardening | ✅ Completada |
| Fase 4 — Mejoras post-MVP | ⏳ Pendiente |

---

## Licencia

Privado — todos los derechos reservados.
