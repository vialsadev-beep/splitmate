# 🗺️ Roadmap Técnico — SplitMate

> Autor: PM + ORC
> Última revisión: 2026-04-08

---

## Resumen ejecutivo

| Fase | Nombre | Objetivo | Estado |
|------|--------|----------|--------|
| 0 | Descubrimiento | Definir producto y decisiones clave | ✅ Completada |
| 1 | Arquitectura | Diseño completo antes del código | ✅ Completada |
| 2 | MVP | App funcional de extremo a extremo | ✅ Completada |
| 3 | Hardening | Calidad, seguridad y performance | ✅ Completada |
| 4 | Mejoras | Features post-MVP | ✅ Completada |

---

## Fase 0 — Descubrimiento ✅

**Objetivo:** Entender el problema y tomar decisiones fundacionales antes de cualquier línea de código.

**Completado:**
- [x] Definición del producto y propuesta de valor
- [x] Identificación de usuarios objetivo (JTBD)
- [x] Criterios de éxito del MVP
- [x] Decisión de stack tecnológico (ADR-001)
- [x] Decisión de arquitectura (ADR-002)
- [x] Decisión de base de datos (ADR-003)
- [x] Análisis de seguridad inicial (OWASP)
- [x] Flujos UX críticos definidos

---

## Fase 1 — Arquitectura ✅

**Objetivo:** Diseñar la arquitectura completa de forma que todos los agentes compartan el mismo modelo mental antes de implementar.

**Completado:**
- [x] Diagrama de sistema completo
- [x] Estructura de carpetas definitiva
- [x] Schema Prisma completo
- [x] Contratos de API (todos los endpoints)
- [x] ADR-003: PostgreSQL
- [x] ADR-004: Balance calculado en runtime
- [x] ADR-005: JWT + Refresh tokens
- [x] Backlog MVP priorizado (P0/P1/P2)
- [x] Estrategia de tests definida

---

## Fase 2 — MVP 🔄

**Objetivo:** Implementar una aplicación funcional de extremo a extremo que cubra los flujos críticos del usuario.

### Sprint 1 — Infraestructura base
```
[ ] Setup monorepo (Turborepo + workspaces)
[ ] docker-compose (PostgreSQL + Redis)
[ ] Prisma schema + primera migración
[ ] Configuración ESLint + Prettier + TypeScript
[ ] GitHub Actions CI básico (lint + typecheck)
[ ] Configuración Vite + React + Tailwind + shadcn/ui
[ ] Layout base (AppShell, BottomNav, TopBar)
[ ] Sistema de theming dark/light con CSS variables
```

### Sprint 2 — Auth completo
```
[ ] BE: registro email + bcrypt
[ ] BE: login + JWT + refresh tokens
[ ] BE: middleware authenticate
[ ] BE: Google OAuth (Passport.js)
[ ] FE: página de login
[ ] FE: página de registro
[ ] FE: Google OAuth button
[ ] FE: interceptor axios renovación automática de token
[ ] FE: Zustand auth store
[ ] FE: ProtectedRoute guard
```

### Sprint 3 — Grupos
```
[ ] BE: CRUD grupos
[ ] BE: sistema de invitación por link (inviteCode)
[ ] BE: middleware authorize (verificar membership)
[ ] BE: gestión de roles (admin/member)
[ ] FE: listado de grupos
[ ] FE: crear grupo (modal/page)
[ ] FE: detalle del grupo (tabs: gastos / balance / miembros)
[ ] FE: copiar link de invitación
[ ] FE: unirse al grupo con código
```

### Sprint 4 — Gastos (split igual)
```
[ ] BE: crear gasto con splitType EQUAL
[ ] BE: listar gastos con paginación
[ ] BE: editar / eliminar gasto (soft delete)
[ ] BE: audit log automático en gastos
[ ] FE: formulario de creación de gasto (EQUAL)
[ ] FE: lista de gastos del grupo
[ ] FE: tarjeta de gasto con mi parte
[ ] FE: categorías (picker)
```

### Sprint 5 — Balances y pagos
```
[ ] BE: cálculo de balance neto por usuario
[ ] BE: algoritmo de simplificación de deudas
[ ] BE: endpoint /balances/simplified
[ ] BE: registrar pago manual
[ ] FE: pantalla de balance del grupo
[ ] FE: deudas simplificadas
[ ] FE: flujo "saldar deuda" → PaymentForm
[ ] FE: historial de pagos
[ ] TESTS: 20+ casos del algoritmo de simplificación
```

### Sprint 6 — Splits avanzados y polish
```
[ ] BE: splitType EXACT + PERCENTAGE + SHARES
[ ] FE: SplitSelector (todos los tipos)
[ ] FE: modo oscuro funcional al 100%
[ ] FE: i18n ES/EN completo
[ ] FE: PWA manifest + service worker básico
[ ] FE: estados de loading, error y vacío en todas las pantallas
[ ] QA: tests E2E flujos críticos (Playwright)
[ ] QA: tests integración todos los endpoints
```

---

## Fase 3 — Hardening ✅

**Objetivo:** Elevar la calidad a nivel enterprise antes de lanzar.

```
[x] Security audit completo (headers, rate limits, CORS)
[x] Redis cache en endpoints de balance
[x] Paginación cursor-based (mejor performance que offset)
[x] Manejo de errores robusto (retry logic en FE)
[x] Logging estructurado (Pino) con trace IDs
[x] Métricas básicas (response times, error rates)
[x] Cron job: limpiar refresh tokens expirados
[ ] Tests de carga básicos
[ ] Revisión de accesibilidad (a11y)
[ ] Optimización de bundle (code splitting, lazy loading)
[x] Deploy a producción (Railway — API + PostgreSQL + Redis)
[x] Variables de entorno y secrets gestionados correctamente
[ ] README completo para onboarding externo
```

---

## Fase 4 — Mejoras post-MVP ✅

**Objetivo:** Añadir funcionalidades que mejoran la experiencia y la retención.

### Alta prioridad
```
[x] Presupuestos por grupo/categoría con alertas (WEEKLY/MONTHLY/YEARLY/CUSTOM, estados ok/warning/exceeded)
[x] Notificaciones in-app (feed, badge no leídas, mark-as-read individual y masivo)
[x] Historial de actividad del grupo (feed agrupado por día)
[x] Edición de gastos ya existentes con recálculo de splits
[x] Exportar gastos a CSV (con BOM para Excel, filtros search/fecha)
```

### Media prioridad
```
[x] Estadísticas y gráficas del grupo (donut categorías + barras mensuales + ranking miembros)
[x] Búsqueda en gastos (ILIKE con debounce 300ms)
[x] Adjuntar foto al gasto — ticket/factura (multer, 5MB, JPEG/PNG/WebP, IDOR protegido)
[x] Avatar personalizado por grupo (upload, solo admin)
[x] Límite de deuda configurable con notificación DEBT_LIMIT (antispam 24h)
```

### Baja prioridad / investigar
```
[ ] Multi-moneda con conversión automática (API de tipos de cambio)
[ ] Integración con bancos (Open Banking) para detectar pagos
[ ] App nativa (React Native compartiendo lógica)
[ ] API pública para integraciones
```

### Explícitamente fuera de scope
```
❌ OCR de tickets — no en MVP ni Fase 4 inmediata
❌ Integración Bizum/PayPal/Stripe — pagos son solo registro manual
❌ Chat integrado — fuera del core de la app
```

---

## Criterios de completitud por fase

### Fase 2 (MVP) está completa cuando:
- Un usuario puede registrarse, crear un grupo, invitar amigos, añadir gastos de todos los tipos de división, y ver el balance simplificado en < 60 segundos desde el registro
- Los tests E2E de los 2 flujos críticos pasan en CI
- La app es completamente funcional en Chrome mobile (viewport 390px)
- Modo oscuro y i18n (ES/EN) funcionan al 100%

### Fase 3 está completa cuando:
- Ninguna vulnerabilidad OWASP Top 10 activa
- Response time p95 < 300ms en los endpoints críticos
- Cobertura de tests: unit ≥ 90% en balances, integración ≥ 80% en endpoints
- Deploy automático desde rama main

---

---

## Historial de revisiones

| Fecha | Evento |
|-------|--------|
| 2026-04-08 | Fases 0–1 completadas (Descubrimiento + Arquitectura) |
| 2026-04-08 | Fase 2 completada (MVP funcional extremo a extremo) |
| 2026-04-08 | Fase 3 completada (Hardening: tests, seguridad, Redis, CI/CD, deploy) |
| 2026-04-09 | Fase 4 completada — alta + media prioridad (10 features, revisión de seguridad) |
| 2026-04-09 | API desplegada en Railway (PostgreSQL + Redis + API service) |

*Mantenido por: PM + ORC. Actualizar al inicio de cada fase.*
