# ADR-001: Stack Tecnológico

| Campo | Valor |
|-------|-------|
| **ID** | ADR-001 |
| **Título** | Stack tecnológico del proyecto |
| **Fecha** | 2026-04-08 |
| **Estado** | ✅ Aprobado |
| **Autor** | Tech Lead |
| **Revisores** | PM, SEC, QA, ORC |
| **Fase** | 0 — Descubrimiento |

---

## Contexto

Se necesita definir el stack completo para una aplicación web de gestión de gastos compartidos con los siguientes requisitos no negociables:

- Mobile-first (PWA)
- Sin necesidad de SEO (app autenticada)
- TypeScript full-stack para contratos compartidos
- Arquitectura Vertical Slice (VSA)
- Equipo orientado a JavaScript/TypeScript

## Decisión

### Frontend

| Tecnología | Versión | Rol |
|-----------|---------|-----|
| React | 18 | Framework UI |
| Vite | 5+ | Build tool + dev server |
| TypeScript | 5+ | Tipado estático |
| shadcn/ui | latest | Componentes UI |
| Tailwind CSS | 3+ | Estilos utility-first |
| Zustand | 4+ | Estado global UI |
| React Query | 5+ | Estado del servidor |
| React Router | 6+ | Enrutamiento |
| i18next | latest | Internacionalización |

### Backend

| Tecnología | Versión | Rol |
|-----------|---------|-----|
| Node.js | 20 LTS | Runtime |
| Express | 4+ | Framework HTTP |
| TypeScript | 5+ | Tipado estático |
| Prisma | 5+ | ORM |
| Zod | 3+ | Validación de esquemas |
| Passport.js | latest | Autenticación |
| jsonwebtoken | latest | JWT |

### Infraestructura

| Tecnología | Rol |
|-----------|-----|
| PostgreSQL 15 | Base de datos principal |
| Redis 7 | Caché y rate limiting |
| Docker + docker-compose | Entorno de desarrollo |
| Turborepo | Gestión de monorepo |
| Vitest | Tests unitarios |
| Playwright | Tests E2E |
| Supertest | Tests de integración API |

## Alternativas consideradas

### Frontend framework

| Opción | Evaluación | Decisión |
|--------|-----------|----------|
| **React + Vite** | ✅ Ecosistema maduro, HMR óptimo, SPA perfecta para PWA | **Elegido** |
| Next.js | ❌ SSR innecesario para app autenticada, complejidad extra sin beneficio | Descartado |
| SvelteKit | ❌ Ecosistema menor, menos librerías enterprise, curva de aprendizaje | Descartado |
| Vue 3 + Vite | ⚠️ Válido técnicamente, pero React dominante en el mercado | Descartado |

### UI Library

| Opción | Evaluación | Decisión |
|--------|-----------|----------|
| **shadcn/ui + Tailwind** | ✅ Control total, accesible, sin vendor lock-in, mobile-first | **Elegido** |
| Material UI | ❌ Sobreingeniería, look "corporativo", pesado | Descartado |
| Ant Design | ❌ Orientado a desktop, poco flexible | Descartado |
| Chakra UI | ⚠️ Válido pero menos flexible que shadcn | Descartado |

### State management

| Opción | Evaluación | Decisión |
|--------|-----------|----------|
| **Zustand + React Query** | ✅ Separación clara UI/server state, mínima complejidad | **Elegido** |
| Redux Toolkit | ❌ Overengineering para este tamaño de app | Descartado |
| Jotai | ⚠️ Válido, pero Zustand más familiar y maduro | Descartado |
| Context API puro | ❌ Rendimiento pobre con datos del servidor | Descartado |

### Backend framework

| Opción | Evaluación | Decisión |
|--------|-----------|----------|
| **Express** | ✅ Familiar, ecosistema enorme, VSA simple de implementar | **Elegido** |
| Fastify | ⚠️ Mejor performance, pero Express suficiente para MVP. Migración posible post-MVP | Descartado (por ahora) |
| NestJS | ❌ Opinionated en arquitectura, conflicta con VSA personalizada | Descartado |
| Hono | ⚠️ Moderno y ligero, pero menos maduro | Descartado |

## Consecuencias

### Positivas
- TypeScript end-to-end con contratos compartidos entre FE y BE
- DX excelente con Vite HMR < 100ms
- shadcn/ui permite customización total del design system
- React Query gestiona caché, loading states y errores automáticamente
- Prisma proporciona type-safety hasta la base de datos

### Negativas / Trade-offs
- Bundle inicial requiere code splitting cuidadoso para PWA
- Express es menos performante que Fastify (aceptable en MVP)
- Zustand requiere disciplina para no crear slices globales innecesarios

### Riesgos mitigados
- Vendor lock-in: shadcn/ui no tiene vendor lock-in (componentes son código propio)
- Performance: React Query evita waterfalls de fetch con prefetching

## Notas de implementación

- Los tipos Zod se definen en `packages/shared/src/contracts/` y se importan tanto en FE como en BE
- El cliente axios en FE maneja automáticamente la rotación de tokens (interceptor)
- Tailwind se configura con el design system de tokens (tema claro/oscuro) desde el inicio

---

*Revisado y aprobado en Fase 0 por: ORC, PM, TL, SEC, QA*
