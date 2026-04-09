# 📁 Estructura de Carpetas — SplitMate

> Documento de referencia para la geometría del proyecto.
> Autor: Diseñador de Estructura + Tech Lead
> Última revisión: 2026-04-08

---

## Árbol completo

```
appgastos/
│
├── apps/
│   ├── web/                               # 🌐 Frontend React
│   │   ├── public/
│   │   │   ├── manifest.json              # PWA manifest
│   │   │   ├── icons/                     # App icons (192, 512px)
│   │   │   └── sw.js                      # Service worker (Fase 2)
│   │   │
│   │   ├── src/
│   │   │   ├── main.tsx                   # Entry point React
│   │   │   ├── App.tsx                    # Root component + providers
│   │   │   │
│   │   │   ├── slices/                    # ← VERTICAL SLICES (FE)
│   │   │   │   │
│   │   │   │   ├── auth/
│   │   │   │   │   ├── api/
│   │   │   │   │   │   └── auth.queries.ts      # React Query mutations/queries
│   │   │   │   │   ├── components/
│   │   │   │   │   │   ├── LoginForm.tsx
│   │   │   │   │   │   ├── RegisterForm.tsx
│   │   │   │   │   │   └── GoogleButton.tsx
│   │   │   │   │   ├── pages/
│   │   │   │   │   │   ├── LoginPage.tsx
│   │   │   │   │   │   └── RegisterPage.tsx
│   │   │   │   │   ├── store/
│   │   │   │   │   │   └── auth.store.ts        # Zustand: { user, token, isAuth }
│   │   │   │   │   └── types.ts
│   │   │   │   │
│   │   │   │   ├── groups/
│   │   │   │   │   ├── api/
│   │   │   │   │   │   └── groups.queries.ts
│   │   │   │   │   ├── components/
│   │   │   │   │   │   ├── GroupCard.tsx
│   │   │   │   │   │   ├── GroupForm.tsx
│   │   │   │   │   │   ├── MemberList.tsx
│   │   │   │   │   │   ├── MemberItem.tsx
│   │   │   │   │   │   ├── InviteLink.tsx
│   │   │   │   │   │   └── JoinGroupModal.tsx
│   │   │   │   │   ├── pages/
│   │   │   │   │   │   ├── GroupsPage.tsx       # Lista de mis grupos
│   │   │   │   │   │   └── GroupDetailPage.tsx  # Detalle + pestañas
│   │   │   │   │   └── types.ts
│   │   │   │   │
│   │   │   │   ├── expenses/
│   │   │   │   │   ├── api/
│   │   │   │   │   │   └── expenses.queries.ts
│   │   │   │   │   ├── components/
│   │   │   │   │   │   ├── ExpenseCard.tsx
│   │   │   │   │   │   ├── ExpenseList.tsx
│   │   │   │   │   │   ├── ExpenseForm.tsx      # Formulario unificado
│   │   │   │   │   │   ├── SplitSelector.tsx    # EQUAL/EXACT/PERCENTAGE/SHARES
│   │   │   │   │   │   ├── ParticipantPicker.tsx
│   │   │   │   │   │   └── ExpenseDetail.tsx
│   │   │   │   │   ├── pages/
│   │   │   │   │   │   ├── ExpensesPage.tsx     # Historial del grupo
│   │   │   │   │   │   └── CreateExpensePage.tsx
│   │   │   │   │   └── types.ts
│   │   │   │   │
│   │   │   │   ├── balances/
│   │   │   │   │   ├── api/
│   │   │   │   │   │   └── balances.queries.ts
│   │   │   │   │   ├── components/
│   │   │   │   │   │   ├── BalanceSummary.tsx   # Resumen de mi balance
│   │   │   │   │   │   ├── DebtCard.tsx         # Deuda individual
│   │   │   │   │   │   ├── SimplifiedDebts.tsx  # Lista simplificada
│   │   │   │   │   │   └── SettleButton.tsx     # CTA saldar deuda
│   │   │   │   │   ├── pages/
│   │   │   │   │   │   └── BalancePage.tsx      # Pantalla principal balances
│   │   │   │   │   └── types.ts
│   │   │   │   │
│   │   │   │   ├── payments/
│   │   │   │   │   ├── api/
│   │   │   │   │   │   └── payments.queries.ts
│   │   │   │   │   ├── components/
│   │   │   │   │   │   ├── PaymentForm.tsx
│   │   │   │   │   │   └── PaymentHistory.tsx
│   │   │   │   │   └── types.ts
│   │   │   │   │
│   │   │   │   ├── categories/
│   │   │   │   │   ├── api/
│   │   │   │   │   ├── components/
│   │   │   │   │   │   ├── CategoryBadge.tsx
│   │   │   │   │   │   └── CategoryPicker.tsx
│   │   │   │   │   └── types.ts
│   │   │   │   │
│   │   │   │   ├── budgets/                     # Fase 2
│   │   │   │   │   └── ...
│   │   │   │   │
│   │   │   │   ├── notifications/
│   │   │   │   │   ├── api/
│   │   │   │   │   ├── components/
│   │   │   │   │   │   ├── NotificationBell.tsx
│   │   │   │   │   │   └── NotificationList.tsx
│   │   │   │   │   └── types.ts
│   │   │   │   │
│   │   │   │   └── profile/
│   │   │   │       ├── components/
│   │   │   │       │   └── ProfileForm.tsx
│   │   │   │       └── pages/
│   │   │   │           └── ProfilePage.tsx
│   │   │   │
│   │   │   ├── shared/                          # ← SHARED KERNEL (FE)
│   │   │   │   │
│   │   │   │   ├── components/
│   │   │   │   │   ├── ui/                      # shadcn/ui re-exports + customizados
│   │   │   │   │   │   ├── button.tsx
│   │   │   │   │   │   ├── input.tsx
│   │   │   │   │   │   ├── dialog.tsx
│   │   │   │   │   │   └── ...
│   │   │   │   │   ├── layout/
│   │   │   │   │   │   ├── AppLayout.tsx        # Shell general con nav
│   │   │   │   │   │   ├── BottomNav.tsx        # Nav móvil
│   │   │   │   │   │   ├── TopBar.tsx           # Header
│   │   │   │   │   │   └── PageContainer.tsx    # Max-width + padding
│   │   │   │   │   ├── ErrorBoundary.tsx
│   │   │   │   │   ├── LoadingSpinner.tsx
│   │   │   │   │   ├── EmptyState.tsx
│   │   │   │   │   └── CurrencyDisplay.tsx      # Formateo consistente de moneda
│   │   │   │   │
│   │   │   │   ├── hooks/
│   │   │   │   │   ├── useAuth.ts               # Acceso al auth store
│   │   │   │   │   ├── useTheme.ts              # dark/light mode
│   │   │   │   │   └── useDebounce.ts
│   │   │   │   │
│   │   │   │   ├── lib/
│   │   │   │   │   ├── api-client.ts            # Axios instance + interceptors JWT
│   │   │   │   │   ├── query-client.ts          # React Query config
│   │   │   │   │   └── i18n.ts                  # i18next config
│   │   │   │   │
│   │   │   │   └── utils/
│   │   │   │       ├── currency.ts              # formatCurrency, parseCurrency
│   │   │   │       └── date.ts                  # formatDate, relativeDate
│   │   │   │
│   │   │   ├── router/
│   │   │   │   ├── index.tsx                    # React Router config
│   │   │   │   └── guards.tsx                   # ProtectedRoute, GuestRoute
│   │   │   │
│   │   │   └── styles/
│   │   │       ├── globals.css                  # Reset + base styles
│   │   │       └── theme.css                    # CSS variables dark/light
│   │   │
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   ├── tailwind.config.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   └── api/                               # ⚙️ Backend Express
│       ├── src/
│       │   ├── server.ts                  # Entry point — arranca Express
│       │   ├── app.ts                     # Config Express + middlewares globales
│       │   │
│       │   ├── slices/                    # ← VERTICAL SLICES (BE)
│       │   │   │
│       │   │   ├── auth/
│       │   │   │   ├── auth.router.ts     # Rutas: /auth/*
│       │   │   │   ├── auth.handler.ts    # Handlers HTTP (orquesta)
│       │   │   │   ├── auth.service.ts    # Lógica: hash, JWT, OAuth
│       │   │   │   ├── auth.repository.ts # DB: User, RefreshToken, OAuthAccount
│       │   │   │   ├── auth.schema.ts     # Zod: RegisterInput, LoginInput
│       │   │   │   ├── auth.types.ts      # Tipos TypeScript del slice
│       │   │   │   └── auth.test.ts       # Tests unitarios + integración
│       │   │   │
│       │   │   ├── groups/
│       │   │   │   ├── groups.router.ts
│       │   │   │   ├── groups.handler.ts
│       │   │   │   ├── groups.service.ts  # Lógica: crear, invitar, roles
│       │   │   │   ├── groups.repository.ts
│       │   │   │   ├── groups.schema.ts
│       │   │   │   ├── groups.types.ts
│       │   │   │   └── groups.test.ts
│       │   │   │
│       │   │   ├── expenses/
│       │   │   │   ├── expenses.router.ts
│       │   │   │   ├── expenses.handler.ts
│       │   │   │   ├── expenses.service.ts  # Lógica: splits, validación montos
│       │   │   │   ├── expenses.repository.ts
│       │   │   │   ├── expenses.schema.ts
│       │   │   │   ├── expenses.types.ts
│       │   │   │   └── expenses.test.ts
│       │   │   │
│       │   │   ├── balances/
│       │   │   │   ├── balances.router.ts
│       │   │   │   ├── balances.handler.ts
│       │   │   │   ├── balances.service.ts   # ← Algoritmo simplificación (CRÍTICO)
│       │   │   │   ├── balances.repository.ts # Queries de cálculo
│       │   │   │   ├── balances.types.ts
│       │   │   │   └── balances.test.ts       # 20+ test cases obligatorios
│       │   │   │
│       │   │   ├── payments/
│       │   │   │   ├── payments.router.ts
│       │   │   │   ├── payments.handler.ts
│       │   │   │   ├── payments.service.ts
│       │   │   │   ├── payments.repository.ts
│       │   │   │   ├── payments.schema.ts
│       │   │   │   └── payments.test.ts
│       │   │   │
│       │   │   ├── categories/
│       │   │   │   └── ...
│       │   │   │
│       │   │   ├── budgets/               # Fase 2
│       │   │   │   └── ...
│       │   │   │
│       │   │   ├── notifications/
│       │   │   │   └── ...
│       │   │   │
│       │   │   └── audit/
│       │   │       ├── audit.service.ts   # Servicio de escritura de audit logs
│       │   │       └── audit.types.ts
│       │   │
│       │   ├── shared/                    # ← SHARED KERNEL (BE)
│       │   │   ├── middleware/
│       │   │   │   ├── authenticate.ts    # Verifica JWT → req.user
│       │   │   │   ├── authorize.ts       # Verifica membership en grupo
│       │   │   │   ├── validate.ts        # Middleware Zod genérico
│       │   │   │   ├── rateLimit.ts       # express-rate-limit + Redis
│       │   │   │   └── errorHandler.ts    # Manejo centralizado de errores
│       │   │   │
│       │   │   ├── errors/
│       │   │   │   ├── AppError.ts        # Clase base de errores HTTP
│       │   │   │   └── errorCodes.ts      # Catálogo de códigos de error
│       │   │   │
│       │   │   ├── lib/
│       │   │   │   ├── prisma.ts          # Prisma client singleton
│       │   │   │   ├── redis.ts           # Redis client singleton
│       │   │   │   └── logger.ts          # Pino logger config
│       │   │   │
│       │   │   └── utils/
│       │   │       └── pagination.ts      # Helpers paginación
│       │   │
│       │   └── config/
│       │       └── env.ts                 # Validación de env vars con Zod
│       │
│       ├── prisma/
│       │   ├── schema.prisma              # Schema completo de la BD
│       │   ├── migrations/                # Migraciones versionadas
│       │   └── seed.ts                    # Datos de desarrollo
│       │
│       ├── tsconfig.json
│       └── package.json
│
├── packages/                              # 📦 MONOREPO SHARED
│   └── shared/
│       ├── src/
│       │   ├── contracts/                 # Tipos Zod compartidos FE+BE
│       │   │   ├── auth.contracts.ts
│       │   │   ├── groups.contracts.ts
│       │   │   ├── expenses.contracts.ts
│       │   │   ├── balances.contracts.ts
│       │   │   └── payments.contracts.ts
│       │   └── index.ts                   # Re-exporta todo
│       ├── package.json
│       └── tsconfig.json
│
├── docs/                                  # 📚 DOCUMENTACIÓN
│   ├── PROJECT_LOG.md                     # Registro cronológico del proyecto
│   ├── architecture/
│   │   ├── overview.md                    # Este documento: visión general
│   │   ├── folder-structure.md            # Estructura de carpetas (este archivo)
│   │   ├── data-model.md                  # Modelo de datos detallado
│   │   └── decisions/                     # ADRs
│   │       ├── ADR-001-stack.md
│   │       ├── ADR-002-vsa.md
│   │       ├── ADR-003-database.md
│   │       ├── ADR-004-balance-calc.md
│   │       └── ADR-005-auth.md
│   ├── api/
│   │   ├── contracts.md                   # Contratos request/response
│   │   └── openapi.yaml                   # Spec OpenAPI (generada en Fase 2)
│   ├── onboarding.md                      # Guía para nuevos developers
│   ├── testing-guide.md                   # Estrategia y guía de tests
│   └── roadmap.md                         # Roadmap por fases
│
├── .github/
│   └── workflows/
│       ├── ci.yml                         # Tests + lint en cada PR
│       └── deploy.yml                     # Deploy a producción desde main
│
├── docker-compose.yml                     # PostgreSQL + Redis para desarrollo
├── docker-compose.test.yml               # BD de test aislada
├── .env.example                           # Variables de entorno requeridas
├── turbo.json                             # Configuración Turborepo
├── package.json                           # Root workspace
└── README.md                              # Guía de inicio rápido
```

---

## Convenciones de nomenclatura

| Tipo | Convención | Ejemplo |
|------|-----------|---------|
| Archivos TypeScript | kebab-case | `auth.service.ts` |
| Componentes React | PascalCase | `ExpenseCard.tsx` |
| Carpetas | kebab-case | `slices/expenses/` |
| Variables/funciones | camelCase | `createExpense()` |
| Constantes | SCREAMING_SNAKE_CASE | `MAX_GROUP_MEMBERS` |
| Tipos/Interfaces | PascalCase | `CreateExpenseInput` |
| Zod schemas | camelCase + `Schema` | `createExpenseSchema` |
| Tests | mismo nombre + `.test.ts` | `expenses.test.ts` |

## Reglas de importación entre slices

```typescript
// ✅ Correcto: importar desde el mismo slice
import { expensesRepository } from './expenses.repository'

// ✅ Correcto: importar desde shared
import { AppError } from '../../shared/errors/AppError'
import { prisma } from '../../shared/lib/prisma'

// ✅ Correcto: importar contratos del monorepo
import { CreateExpenseSchema } from '@splitmate/shared'

// ❌ Incorrecto: importar de otro slice
import { groupsService } from '../groups/groups.service'
```

---

*Revisado en Fase 1 por: PE, TL, FE, BE*
