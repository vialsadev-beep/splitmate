# 🏗️ Arquitectura del Sistema — SplitMate

> Documento vivo. Actualizado por: Tech Lead + Documentation Engineer
> Última revisión: 2026-04-08

---

## Visión general

SplitMate es una aplicación web de gestión de gastos compartidos (PWA, mobile-first) construida sobre una arquitectura **Vertical Slice** con separación clara entre frontend (React SPA) y backend (Express API REST).

---

## Diagrama de alto nivel

```
┌─────────────────────────────────────────────────────────────┐
│                     CLIENTE (Browser / PWA)                 │
│                                                             │
│   React 18 + Vite + TypeScript                              │
│                                                             │
│   ┌─────────────────────────────────────────────────────┐   │
│   │                   Slices (UI)                       │   │
│   │  /auth  │  /groups  │  /expenses  │  /balances  │...│   │
│   └────────────────────────┬────────────────────────────┘   │
│                            │                                │
│   React Query (server state) + Zustand (UI state)           │
│   React Router v6                                           │
└────────────────────────────┼────────────────────────────────┘
                             │ HTTPS · REST · JSON
                             │ Authorization: Bearer <JWT>
┌────────────────────────────┼────────────────────────────────┐
│                     SERVIDOR                                │
│                                                             │
│   Node.js + Express + TypeScript                            │
│                                                             │
│   ┌────────────────────────────────────────────────────┐    │
│   │  Middleware global: auth · validate · rateLimit    │    │
│   └────────────────────────────────────────────────────┘    │
│                                                             │
│   ┌─────────────────────────────────────────────────────┐   │
│   │                   Slices (API)                      │   │
│   │  /auth  │  /groups  │  /expenses  │  /balances  │...│   │
│   │                                                     │   │
│   │  Cada slice: Router → Handler → Service → Repo     │   │
│   └────────────────────────┬────────────────────────────┘   │
│                            │                                │
│   ┌────────────────────────┼────────────────────────────┐   │
│   │         DATOS          │                            │   │
│   │                        │                            │   │
│   │   PostgreSQL        Redis                           │   │
│   │   (Prisma ORM)      (sessions, rate limit)          │   │
│   └────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## Principios arquitectónicos

### 1. Vertical Slice Architecture (VSA)

Cada funcionalidad es un "slice" vertical que atraviesa todas las capas necesarias (UI, API, lógica, datos). Los slices son independientes entre sí.

```
✅ CORRECTO: expenses/expenses.service.ts importa expenses/expenses.repository.ts
❌ INCORRECTO: expenses/expenses.service.ts importa groups/groups.service.ts
```

Si dos slices necesitan lógica común → va a `shared/`.

### 2. Capas dentro de cada slice (backend)

```
Router → Schema (Zod) → Handler → Service → Repository → Prisma
```

- **Router:** define rutas y aplica middlewares del slice
- **Schema:** validación de entrada con Zod (fail fast)
- **Handler:** orquesta, no tiene lógica de negocio
- **Service:** toda la lógica de negocio del slice
- **Repository:** toda la interacción con la base de datos

### 3. Contratos compartidos

El paquete `packages/shared/` exporta los tipos Zod/TypeScript usados tanto en frontend como en backend. Esto garantiza que request/response sean consistentes en compilación.

### 4. Fail fast

La validación Zod ocurre antes de que el handler se ejecute (middleware). Si los datos de entrada son inválidos, se retorna 400 inmediatamente con detalles del error.

### 5. Seguridad por capas

```
1. Rate limiting (Redis) — antes de cualquier procesamiento
2. Autenticación JWT — verifica identidad
3. Autorización por grupo — verifica que el usuario pertenece al grupo
4. Validación Zod — verifica formato de datos
5. Prisma queries — evita inyección SQL
6. Cálculos en backend — nunca confiar en valores financieros del cliente
```

---

## Decisiones técnicas clave

| Decisión | Elección | Alternativa descartada | Razón |
|----------|----------|----------------------|-------|
| Frontend | React + Vite | Next.js | SSR innecesario, sin SEO crítico |
| Backend | Express | Fastify | Familiaridad, extensible a Fastify post-MVP |
| BD | PostgreSQL | MongoDB | Datos relacionales financieros, ACID |
| ORM | Prisma | TypeORM / Knex | Type-safety, migraciones declarativas |
| Auth | JWT + Refresh | Sessions puras | Stateless, escalable horizontalmente |
| UI | shadcn/ui + Tailwind | Material UI / Ant | Control total, sin sobreingeniería |
| Estado | Zustand + React Query | Redux | Mínima complejidad, separación clara |
| Monorepo | Turborepo | Nx / Lerna | Ligero, builds incrementales |
| Balance | Calculado en runtime | Tabla persistida | Cero inconsistencias, auditoría natural |

---

## Flujo de autenticación

```
1. Usuario → POST /auth/login
2. Servidor → verifica credenciales → genera access token (15min) + refresh token (7d)
3. Cliente → almacena access token en memoria, refresh token en httpOnly cookie
4. Request autenticada → Authorization: Bearer <access_token>
5. Token expirado → POST /auth/refresh → nuevo access token (rotación automática)
6. Logout → POST /auth/logout → revoca refresh token en BD
```

---

## Algoritmo de simplificación de deudas

**Objetivo:** minimizar el número de transferencias para saldar todas las deudas del grupo.

**Input:** lista de (usuario, balance_neto)
**Output:** lista mínima de (deudor, acreedor, monto)

```
Algoritmo Greedy:
1. Calcular balance neto de cada usuario
   balance_neto = Σ(gastos pagados por él) - Σ(gastos que debe a otros)
                  + Σ(pagos recibidos) - Σ(pagos enviados)

2. Separar:
   - acreedores: balance_neto > 0 (les deben dinero)
   - deudores:   balance_neto < 0 (deben dinero)

3. Mientras haya deudores:
   a. Tomar el mayor deudor (el que más debe)
   b. Tomar el mayor acreedor (al que más le deben)
   c. Transferencia = min(|deuda|, |acreencia|)
   d. Registrar: deudor → acreedor: transferencia
   e. Actualizar balances

4. Resultado: lista mínima de transferencias
```

**Complejidad:** O(n log n) donde n = número de miembros con balance ≠ 0.

---

## Modelo de datos — resumen

Ver `docs/architecture/data-model.md` para el schema Prisma completo.

Entidades principales y sus relaciones:

```
User ────── GroupMember ────── Group
              │                  │
              │              Expense ────── ExpenseSplit ────── User
              │                  │
              └──────────── Payment (from User → to User)
```

---

## Entornos

| Entorno | Base de datos | Descripción |
|---------|--------------|-------------|
| development | PostgreSQL local (Docker) | Dev local con hot reload |
| test | PostgreSQL test (Docker) | BD separada para tests de integración |
| production | PostgreSQL gestionado (Railway) | Deploy continuo desde main |

---

## Referencias

- [ADR-001: Stack tecnológico](decisions/ADR-001-stack.md)
- [ADR-002: Vertical Slice Architecture](decisions/ADR-002-vsa.md)
- [ADR-003: PostgreSQL](decisions/ADR-003-database.md)
- [ADR-004: Balance calculado](decisions/ADR-004-balance-calc.md)
- [ADR-005: JWT + Refresh tokens](decisions/ADR-005-auth.md)
- [Estructura de carpetas](folder-structure.md)
- [Modelo de datos](data-model.md)
- [Contratos API](../api/contracts.md)
