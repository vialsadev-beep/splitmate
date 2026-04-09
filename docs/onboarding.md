# 🚀 Guía de Onboarding — SplitMate

> Para nuevos desarrolladores que se incorporan al proyecto.
> Autor: Documentation Engineer
> Última revisión: 2026-04-08

---

## Bienvenido al proyecto

SplitMate es una app web de gestión de gastos compartidos, superior a Tricount en simplicidad y experiencia de usuario. Mobile-first, construida con Vertical Slice Architecture.

**Antes de escribir una sola línea de código, lee:**
1. `docs/architecture/overview.md` — la visión general del sistema
2. `docs/architecture/decisions/ADR-002-vsa.md` — el patrón arquitectónico obligatorio
3. Este documento completo

---

## Requisitos del entorno

| Herramienta | Versión mínima | Cómo instalar |
|-------------|---------------|---------------|
| Node.js | 20 LTS | https://nodejs.org o nvm |
| pnpm | 8+ | `npm install -g pnpm` |
| Docker Desktop | latest | https://docker.com |
| Git | 2.40+ | Sistema o https://git-scm.com |

---

## Setup inicial (primera vez)

```bash
# 1. Clonar el repositorio
git clone <repo-url> splitmate
cd splitmate

# 2. Instalar dependencias (Turborepo gestiona todos los workspaces)
pnpm install

# 3. Copiar variables de entorno
cp .env.example .env
# Editar .env con tus valores locales (ver sección Variables de entorno)

# 4. Levantar servicios de infraestructura
docker-compose up -d
# Levanta: PostgreSQL en :5432, Redis en :6379

# 5. Ejecutar migraciones de base de datos
pnpm --filter api prisma migrate dev

# 6. Cargar datos de desarrollo
pnpm --filter api prisma db seed

# 7. Iniciar la app en modo desarrollo
pnpm dev
# Frontend en: http://localhost:5173
# API en:      http://localhost:3000
```

---

## Variables de entorno

Todas las variables están en `.env.example`. Las críticas:

```bash
# Base de datos
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/splitmate"

# Redis
REDIS_URL="redis://localhost:6379"

# JWT
JWT_SECRET="cambia-esto-en-produccion-min-32-chars"
JWT_ACCESS_EXPIRES="15m"
JWT_REFRESH_EXPIRES="7d"

# Google OAuth (opcional para desarrollo)
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
GOOGLE_CALLBACK_URL="http://localhost:3000/api/v1/auth/google/callback"

# App
PORT=3000
NODE_ENV="development"
CORS_ORIGIN="http://localhost:5173"
```

---

## Estructura del proyecto

El proyecto es un monorepo con Turborepo:

```
apps/web/     → Frontend React (puerto 5173)
apps/api/     → Backend Express (puerto 3000)
packages/shared/ → Tipos y contratos compartidos
```

Ver `docs/architecture/folder-structure.md` para el árbol completo.

---

## Comandos útiles

```bash
# Desarrollo
pnpm dev                          # Arranca FE + BE en paralelo
pnpm --filter web dev             # Solo frontend
pnpm --filter api dev             # Solo backend

# Tests
pnpm test                         # Todos los tests
pnpm --filter api test            # Tests del backend
pnpm --filter web test            # Tests del frontend
pnpm test:e2e                     # Tests E2E con Playwright

# Base de datos
pnpm --filter api prisma studio   # Interfaz visual de la BD
pnpm --filter api prisma migrate dev --name <nombre>  # Nueva migración
pnpm --filter api prisma db seed  # Recargar seed

# Calidad de código
pnpm lint                         # ESLint en todo el monorepo
pnpm typecheck                    # TypeScript en todo el monorepo
pnpm format                       # Prettier

# Build
pnpm build                        # Build de producción
```

---

## Flujo de trabajo con Git

### Ramas

```
main          → producción (protegida)
develop       → integración (base de PRs)
feat/nombre   → nuevas features
fix/nombre    → bugfixes
chore/nombre  → cambios de infraestructura/config
```

### Commits

Usamos Conventional Commits:

```
feat(expenses): add PERCENTAGE split type
fix(balances): handle zero-balance edge case
test(auth): add refresh token rotation tests
docs(adr): add ADR-006 for notifications
chore(deps): update prisma to 5.10
```

### Pull Requests

1. Crear rama desde `develop`
2. Implementar con tests
3. Abrir PR → CI debe pasar (lint + typecheck + tests)
4. Code review por al menos 1 persona
5. Merge a `develop`

**PRs a `main` solo desde `develop` y solo cuando el feature set esté completo.**

---

## Regla de oro de la arquitectura

```
Un slice no importa de otro slice.
La lógica compartida va a shared/.
```

Si encuentras que necesitas importar de otro slice, para y piensa:
- ¿Puedo pasar el dato como parámetro?
- ¿Debería este código ir a `shared/`?
- ¿Estoy modelando el dominio correctamente?

---

## Dónde encontrar qué

| Pregunta | Dónde mirar |
|----------|-------------|
| ¿Cuál es la arquitectura? | `docs/architecture/overview.md` |
| ¿Por qué se eligió X? | `docs/architecture/decisions/ADR-00X.md` |
| ¿Cómo funciona el endpoint Y? | `docs/api/contracts.md` |
| ¿Cómo están organizadas las carpetas? | `docs/architecture/folder-structure.md` |
| ¿Cómo es el modelo de datos? | `docs/architecture/data-model.md` |
| ¿Qué tests debo escribir? | `docs/testing-guide.md` |
| ¿Qué está pendiente? | `docs/roadmap.md` |
| ¿Qué decisiones se tomaron y cuándo? | `docs/PROJECT_LOG.md` |

---

## Contacto y dudas

Si algo no está claro en la documentación, abre un issue en el repositorio con el label `documentation` antes de asumir cómo funciona algo.

La documentación debe reflejar siempre el estado actual del sistema. Si encuentras algo desactualizado, corrígelo en el mismo PR que el código que lo cambia.

---

*Este documento se actualiza con cada cambio significativo en el setup del proyecto.*
