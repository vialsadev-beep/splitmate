# 🗄️ Modelo de Datos — SplitMate

> Autor: DB Architect
> Última revisión: 2026-04-08

---

## Diagrama de entidades y relaciones

```
┌──────────┐     ┌─────────────┐     ┌──────────┐
│   User   │────<│ GroupMember │>────│  Group   │
└──────────┘     └─────────────┘     └──────────┘
     │                                    │
     │                              ┌─────┴──────┐
     │                              │            │
     │                          Expense       Payment
     │                              │
     │                       ┌──────┴──────┐
     │                       │             │
     └──────────────>  ExpenseSplit ◄──────┘
                         (userId, amount)

Relaciones adicionales:
  Group ──> Category ──> Expense
  Group ──> Budget ──> Category
  User  ──> Notification
  User  ──> OAuthAccount
  AuditLog ──> { User, Group, Expense }
```

---

## Entidades detalladas

### User

Identidad y configuración de cada usuario de la plataforma.

| Campo | Tipo | Obligatorio | Descripción |
|-------|------|-------------|-------------|
| id | String (CUID) | ✅ | Identificador único |
| email | String | ✅ | Email único, usado para login |
| name | String | ✅ | Nombre visible |
| avatarUrl | String? | ❌ | URL de foto de perfil |
| passwordHash | String? | ❌ | Hash bcrypt. Null si solo OAuth |
| locale | String | ✅ | Idioma: "es" o "en". Default: "es" |
| theme | String | ✅ | "light", "dark", "system". Default: "system" |
| createdAt | DateTime | ✅ | Auto |
| updatedAt | DateTime | ✅ | Auto |
| deletedAt | DateTime? | ❌ | Soft delete |

**Notas:**
- Un usuario puede tener `passwordHash = null` si se registró solo con Google OAuth
- `locale` y `theme` se sincronizan con las preferencias del dispositivo al primer login

---

### OAuthAccount

Vinculación de cuentas de proveedores OAuth al usuario.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | String | PK |
| userId | String | FK → User |
| provider | String | "google" (extensible a "apple", "github") |
| providerId | String | ID del usuario en el proveedor |
| accessToken | String? | Token OAuth del proveedor |
| refreshToken | String? | Refresh token del proveedor |
| expiresAt | DateTime? | Expiración del token OAuth |

**Notas:**
- Un usuario puede tener múltiples OAuthAccounts (uno por proveedor)
- La clave única es `(provider, providerId)`

---

### RefreshToken

Tokens de refresco para la renovación de sesión.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | String | PK |
| userId | String | FK → User |
| token | String | Token opaco único |
| expiresAt | DateTime | Expiración (7 días desde emisión) |
| createdAt | DateTime | Auto |
| revokedAt | DateTime? | Null = activo. Con valor = revocado |

**Notas:**
- Un token es válido si: `revokedAt IS NULL` AND `expiresAt > NOW()`
- Al hacer refresh, el token antiguo se revoca y se crea uno nuevo (rotación)

---

### Group

Contenedor de gastos compartidos entre un conjunto de usuarios.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | String | PK |
| name | String | Nombre del grupo |
| description | String? | Descripción opcional |
| emoji | String? | Emoji identificador visual (ej: "✈️") |
| currency | String | ISO 4217. Default: "EUR" |
| inviteCode | String | Código único para invitación por link |
| createdAt | DateTime | Auto |
| updatedAt | DateTime | Auto |
| deletedAt | DateTime? | Soft delete (archivado) |

**Notas:**
- `inviteCode` puede regenerarse por el admin para invalidar el link anterior
- El MVP no gestiona conversión de monedas — todos los gastos del grupo usan la misma moneda

---

### GroupMember

Relación muchos-a-muchos entre User y Group, con rol.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | String | PK |
| groupId | String | FK → Group |
| userId | String | FK → User |
| role | GroupRole | ADMIN o MEMBER |
| joinedAt | DateTime | Fecha de unión |
| leftAt | DateTime? | Null = activo. Con valor = ha salido |

**Roles:**
- **ADMIN:** puede editar/eliminar el grupo, gestionar miembros y roles, eliminar cualquier gasto
- **MEMBER:** puede ver el grupo, añadir/editar sus propios gastos

**Notas:**
- Un grupo siempre debe tener al menos un ADMIN
- `leftAt` permite saber si alguien estuvo en el grupo (para el historial de gastos)

---

### Expense

Registro de un gasto realizado y pagado por uno de los miembros del grupo.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | String | PK |
| groupId | String | FK → Group |
| payerId | String | FK → User (quién pagó) |
| title | String | Descripción del gasto |
| amount | Decimal(12,2) | Importe total |
| currency | String | Moneda (hereda del grupo por defecto) |
| splitType | SplitType | EQUAL, EXACT, PERCENTAGE, SHARES |
| categoryId | String? | FK → Category |
| notes | String? | Notas adicionales |
| date | DateTime | Fecha del gasto (no necesariamente la de creación) |
| createdAt | DateTime | Auto |
| updatedAt | DateTime | Auto |
| deletedAt | DateTime? | Soft delete |

**SplitType:**
| Tipo | Descripción | Ejemplo |
|------|-------------|---------|
| EQUAL | División igual entre participantes seleccionados | 90€ ÷ 3 = 30€ cada uno |
| EXACT | Cada participante paga un monto exacto | Ana 40€, Bob 30€, Carl 20€ |
| PERCENTAGE | Cada participante paga un porcentaje | Ana 50%, Bob 30%, Carl 20% |
| SHARES | División por partes proporcionales | Ana 2 partes, Bob 1 parte |

**Invariante:** `Σ ExpenseSplit.amount = Expense.amount` (validado en backend)

---

### ExpenseSplit

División de un gasto entre los participantes.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | String | PK |
| expenseId | String | FK → Expense |
| userId | String | FK → User (participante) |
| amount | Decimal(12,2) | Monto que le corresponde |
| isPaid | Boolean | True si este userId es el payer del expense |

**Notas:**
- `isPaid = true` cuando `userId = expense.payerId` (el pagador ya "pagó" su parte)
- El monto siempre es absoluto — nunca porcentajes (se calculan al crear el gasto)
- La fila del pagador tiene `amount` = su parte proporcional e `isPaid = true`

**Ejemplo:**
```
Expense: "Cena", amount=90€, payerId=Ana
ExpenseSplit:
  { userId: Ana,  amount: 30.00, isPaid: true  }  ← Ana pagó todo, su parte = 30
  { userId: Bob,  amount: 30.00, isPaid: false }  ← Bob debe 30 a Ana
  { userId: Carl, amount: 30.00, isPaid: false }  ← Carl debe 30 a Ana
```

---

### Payment

Pago directo entre dos usuarios para saldar deudas.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | String | PK |
| groupId | String | FK → Group |
| senderId | String | FK → User (quien paga) |
| receiverId | String | FK → User (quien recibe) |
| amount | Decimal(12,2) | Importe del pago |
| currency | String | Moneda del pago |
| notes | String? | Nota (ej: "Transferencia Bizum") |
| date | DateTime | Fecha del pago |
| createdAt | DateTime | Auto |
| deletedAt | DateTime? | Soft delete |

**Notas:**
- Un Payment reduce el balance del sender y aumenta el del receiver
- Los pagos se registran manualmente — no se integra con pasarelas de pago en MVP

---

### Category

Categorías para clasificar los gastos.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | String | PK |
| groupId | String? | Null = categoría global del sistema |
| name | String | Nombre |
| emoji | String? | Icono representativo |
| color | String? | Color hex (ej: "#FF6B6B") |

**Categorías del sistema (seed):**
- 🍽️ Comida y bebida
- 🏠 Alojamiento
- 🚗 Transporte
- 🎉 Ocio y entretenimiento
- 🛒 Compras
- 🏥 Salud
- 📦 Otros

---

### Budget

Presupuesto definido para un grupo, opcionalmente por categoría.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | String | PK |
| groupId | String | FK → Group |
| categoryId | String? | FK → Category (null = todo el grupo) |
| name | String | Nombre del presupuesto |
| amount | Decimal(12,2) | Importe límite |
| period | BudgetPeriod | WEEKLY, MONTHLY, YEARLY, CUSTOM |
| startDate | DateTime | Inicio del período |
| endDate | DateTime? | Fin del período (null para MONTHLY recurrente) |

---

### Notification

Notificaciones in-app para eventos relevantes.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | String | PK |
| userId | String | FK → User (destinatario) |
| type | NotificationType | Tipo de evento |
| title | String | Título corto |
| body | String | Cuerpo de la notificación |
| data | JSON? | Payload extra (ej: { groupId, amount }) |
| readAt | DateTime? | Null = no leída |
| createdAt | DateTime | Auto |

**Tipos de notificación:**
| Tipo | Cuándo se genera |
|------|-----------------|
| EXPENSE_ADDED | Cuando alguien añade un gasto en un grupo del usuario |
| PAYMENT_RECEIVED | Cuando alguien registra un pago al usuario |
| DEBT_LIMIT | Cuando la deuda supera un umbral configurado |
| GROUP_INVITE | Cuando alguien invita al usuario a un grupo |
| BUDGET_ALERT | Cuando el gasto supera el 80% del presupuesto |

---

### AuditLog

Registro inmutable de todos los cambios en datos relevantes.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | String | PK |
| userId | String? | FK → User (quién hizo la acción) |
| groupId | String? | FK → Group (contexto) |
| entityType | String | "expense", "payment", "group", etc. |
| entityId | String | ID de la entidad afectada |
| action | AuditAction | CREATE, UPDATE, DELETE, RESTORE |
| before | JSON? | Estado antes del cambio |
| after | JSON? | Estado después del cambio |
| ip | String? | IP del cliente |
| userAgent | String? | User-Agent del cliente |
| createdAt | DateTime | Auto (inmutable) |

**Notas:**
- Los registros de AuditLog nunca se borran — son inmutables por diseño
- Se puede reconstruir el estado completo de cualquier entidad leyendo su audit trail

---

## Restricciones e invariantes del negocio

| Nº | Invariante | Dónde se valida |
|----|-----------|-----------------|
| B-01 | `Σ ExpenseSplit.amount = Expense.amount` | Backend (expenses.service) |
| B-02 | Para PERCENTAGE: `Σ porcentajes = 100` | Backend (antes de convertir) |
| B-03 | Un grupo debe tener siempre ≥ 1 ADMIN | Backend (groups.service) |
| B-04 | El pagador siempre aparece en ExpenseSplit con `isPaid=true` | Backend automático |
| B-05 | Un usuario no puede pagar una deuda a sí mismo | Backend (payments.service) |
| B-06 | Los montos siempre son > 0 | Zod schema validation |
| B-07 | Los soft-deleted no aparecen en consultas normales | Prisma `where: { deletedAt: null }` |
| B-08 | Los balances se calculan excluyendo expenses soft-deleted | Backend (balances.repository) |

---

*Revisado en Fase 1 por: DB, TL, BE, QA*
