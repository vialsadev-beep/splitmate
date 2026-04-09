# 📋 PROJECT LOG — AppGastos (SplitMate)

> Registro cronológico de todas las decisiones, acciones y eventos relevantes del proyecto.
> Mantenido por: Documentation Engineer
> Última actualización: 2026-04-08

---

## ÍNDICE

- [Sesión 001 — Kickoff y Fase 0](#sesión-001--kickoff-y-fase-0)
- [Sesión 001 — Fase 1: Arquitectura Completa](#sesión-001--fase-1-arquitectura-completa)
- [Sesión 001 — Fase 2: Inicio de implementación MVP](#sesión-001--fase-2-inicio-de-implementación-mvp)

---

## Sesión 001 — Kickoff y Fase 0

**Fecha:** 2026-04-08 | **Fase:** 0 — Descubrimiento | **Estado:** ✅ Completada

### Decisiones tomadas

| ID | Decisión | Responsable |
|----|----------|-------------|
| D-001 | Nombre provisional: SplitMate | PM |
| D-002 | SPA en lugar de SSR | TL |
| D-003 | Framework: React + Vite | TL |
| D-004 | TypeScript obligatorio FE+BE | TL |
| D-005 | UI: shadcn/ui + Tailwind CSS | TL + UX |
| D-006 | Estado: Zustand + React Query | TL |
| D-007 | Backend: Node.js + Express | TL |
| D-008 | ORM: Prisma | TL + DB |
| D-009 | BD: PostgreSQL | DB |
| D-010 | Caché: Redis | TL + SEC |
| D-011 | Auth: JWT (15min) + Refresh (7d) | SEC |
| D-012 | Google OAuth incluido en MVP | PM |
| D-013 | Arquitectura: Vertical Slice (VSA) | TL |
| D-014 | Monorepo con Turborepo | PE |
| D-015 | Balance no persistido en BD | DB + BE |
| D-016 | Soft delete obligatorio | SEC + DB |

---

## Sesión 001 — Fase 1: Arquitectura Completa

**Fecha:** 2026-04-08 | **Fase:** 1 — Arquitectura | **Estado:** ✅ Completada

### Entregables generados
- Diagrama de sistema completo
- Estructura de carpetas definitiva
- Schema Prisma completo (12 modelos)
- Contratos API documentados (todos los endpoints)
- ADR-001 a ADR-005 registrados
- Backlog MVP priorizado (P0/P1/P2)
- Estrategia de tests definida

### Validación de veto
| Agente | Decisión |
|--------|----------|
| Tech Lead | ✅ Sin veto |
| QA | ✅ Sin veto |
| Security | ✅ Sin veto |

---

## Sesión 001 — Fase 2: Inicio de implementación MVP

**Fecha:** 2026-04-08 | **Fase:** 2 — MVP | **Estado:** 🔄 En curso

### Orden de implementación aprobado

```
Sprint 1 → Infraestructura (monorepo, docker, prisma, config)
Sprint 2 → Auth slice completo (FE + BE)
Sprint 3 → Groups slice completo (FE + BE)
Sprint 4 → Expenses slice (split EQUAL primero)
Sprint 5 → Balances + Payments
Sprint 6 → Splits avanzados + i18n + dark mode + PWA
```

### Archivos generados en Sprint 1

**Root del monorepo:**
- `package.json` — workspace pnpm + scripts raíz
- `turbo.json` — pipeline Turborepo
- `docker-compose.yml` — PostgreSQL + Redis
- `docker-compose.test.yml` — BD de test aislada
- `.env.example` — variables de entorno requeridas
- `.gitignore`
- `.prettierrc`
- `eslint.config.mjs`

**packages/shared:**
- Contratos Zod compartidos FE+BE (auth, groups, expenses, balances, payments)

**apps/api:**
- Config TypeScript, Prisma schema, seed
- Shared kernel: middleware, errors, lib
- Slices: auth, groups, expenses, balances, payments, categories, notifications, audit

**apps/web:**
- Config Vite, Tailwind, TypeScript
- Shared kernel: api-client, query-client, layout, i18n
- Slices: auth, groups, expenses, balances, payments

### Notas técnicas de implementación

- Se usa `express-async-errors` para propagación automática de errores async en Express
- Los refresh tokens se almacenan en cookie httpOnly + en BD para revocación
- El algoritmo de simplificación de deudas está en `balances.service.ts` completamente testeado
- `packages/shared` exporta schemas Zod para validación en FE y BE
- Axios interceptor en `api-client.ts` maneja renovación automática de tokens (retry transparente)
- CSS variables en `theme.css` controlan el design system dark/light sin JS

---

*Próxima entrada: Sprint 2 — Auth implementado y testeado*
