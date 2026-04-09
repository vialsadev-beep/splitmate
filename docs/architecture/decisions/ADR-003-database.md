# ADR-003: PostgreSQL como Base de Datos

| Campo | Valor |
|-------|-------|
| **ID** | ADR-003 |
| **Título** | Selección de base de datos: PostgreSQL + Prisma |
| **Fecha** | 2026-04-08 |
| **Estado** | ✅ Aprobado |
| **Autor** | DB Architect |
| **Revisores** | TL, BE, SEC |
| **Fase** | 0 — Descubrimiento |

---

## Contexto

La aplicación gestiona datos financieros compartidos entre usuarios. Los datos son inherentemente relacionales: usuarios pertenecen a grupos, los grupos tienen gastos, los gastos se dividen entre usuarios, los pagos relacionan pares de usuarios dentro de un grupo. La consistencia de estos datos es crítica — un error de cálculo o una inconsistencia de datos afecta directamente a la confianza del usuario en la aplicación.

## Decisión

**Base de datos:** PostgreSQL 15+
**ORM:** Prisma 5+
**Tipo de montos:** `Decimal(12, 2)` en schema Prisma → `NUMERIC(12,2)` en PostgreSQL

## Alternativas consideradas

### MongoDB (NoSQL)

**Por qué se descartó:**
- Los datos son relacionales por naturaleza (users ↔ groups ↔ expenses ↔ splits)
- Las transacciones ACID en MongoDB (sesiones) son más complejas y menos fiables
- Las consultas de balance requieren JOINs complejos — forzar esto en MongoDB con `$lookup` es más costoso y verboso
- Los errores de inconsistencia en datos financieros son inaceptables

### MySQL

**Por qué se descartó:**
- PostgreSQL es superior en: tipos de datos avanzados (JSONB, arrays), extensiones, gestión de concurrencia (MVCC)
- PostgreSQL tiene mejor soporte en plataformas cloud modernas (Supabase, Railway, Render)
- El tipo `NUMERIC` de PostgreSQL es idéntico en ambos — no es una ventaja diferencial de MySQL

### SQLite

**Por qué se descartó:**
- No apto para producción multi-usuario con escrituras concurrentes
- Sin soporte nativo para tipos avanzados
- Sí se usa en tests locales con Prisma cuando no se requiere BD real (tests unitarios puras)

### TypeORM vs Prisma

| Criterio | TypeORM | Prisma |
|----------|---------|--------|
| Type-safety | ⚠️ Parcial | ✅ Total |
| Migraciones | ⚠️ Complejas | ✅ Declarativas |
| DX | ⚠️ Verboso | ✅ Excelente |
| Performance | ✅ Similar | ✅ Similar |
| Comunidad | ✅ Grande | ✅ Creciendo rápido |

**Prisma elegido** por type-safety total, migraciones más fiables y DX superior.

## Decisiones de diseño de datos

### 1. Tipos Decimal para montos financieros

```prisma
amount Decimal @db.Decimal(12, 2)
```

**Por qué:** Los tipos `Float` o `Double` de JavaScript tienen errores de representación en punto flotante (ej: `0.1 + 0.2 !== 0.3`). Para datos financieros esto es inaceptable. `Decimal(12, 2)` garantiza precisión exacta hasta 12 dígitos con 2 decimales (máximo: 9.999.999.999,99).

### 2. Soft delete obligatorio

```prisma
deletedAt DateTime? // null = activo, valor = eliminado
```

**Por qué:** Los gastos y pagos nunca se borran físicamente. Esto permite:
- Auditoría completa del historial
- Restauración ante errores del usuario
- Trazabilidad de cambios

### 3. ExpenseSplit almacena monto absoluto

```prisma
model ExpenseSplit {
  amount Decimal @db.Decimal(12, 2) // NO porcentaje, siempre valor absoluto
}
```

**Por qué:** Almacenar porcentajes requeriría recalcular el monto real en cada consulta, introduciendo posibles errores de redondeo acumulado. El monto absoluto es la fuente de verdad.

### 4. Balance no se persiste

No existe tabla `Balance`. El balance de cada usuario se calcula en tiempo real sumando `ExpenseSplit.amount` donde el usuario es deudor y restando donde es acreedor, considerando también los `Payment`.

**Por qué:** Si el balance fuera persistido, cualquier modificación de un gasto requeriría actualizar múltiples filas de balance en una transacción. El riesgo de inconsistencia es alto. Calculado en runtime, siempre es correcto.

**Mitigación de performance:** Redis cache con TTL corto (30s) sobre el endpoint de balance. Invalidación automática al crear/editar gasto o pago.

### 5. Moneda por grupo

```prisma
model Group {
  currency String @default("EUR") // ISO 4217
}
```

El MVP no gestiona conversiones de moneda. Todos los gastos de un grupo usan la misma moneda. Soporte multi-moneda es post-MVP.

## Índices definidos

```prisma
@@index([groupId])        // en Expense, Payment
@@index([payerId])        // en Expense
@@index([userId])         // en ExpenseSplit, Notification
@@index([entityType, entityId]) // en AuditLog
@@unique([groupId, userId])     // en GroupMember
@@unique([expenseId, userId])   // en ExpenseSplit
```

## Consecuencias

### Positivas
- ACID garantizado para todas las operaciones financieras
- Prisma genera tipos TypeScript desde el schema — type-safety hasta la BD
- `Decimal` nativo evita errores de punto flotante
- Las migraciones Prisma son versionadas y reproducibles
- JSONB disponible para `AuditLog.before/after`

### Negativas / Trade-offs
- PostgreSQL requiere más recursos que SQLite en desarrollo (mitigado con Docker)
- Prisma añade una capa de abstracción — queries complejas pueden requerir `$queryRaw`
- El cálculo de balance en runtime puede ser lento en grupos muy grandes (mitigado con caché en Fase 3)

---

*Revisado y aprobado en Fase 0 por: ORC, TL, DB, BE, SEC*
