# 🔌 Contratos de API — SplitMate

> Autor: Backend Senior + Documentation Engineer
> Última revisión: 2026-04-08
> Base URL: `/api/v1`

---

## Convenciones globales

### Headers

```
Content-Type:  application/json
Accept:        application/json
Authorization: Bearer <access_token>    (rutas protegidas)
```

### Formato de respuesta — éxito

```json
{
  "data": { ... }     // objeto o array según el endpoint
}
```

### Formato de respuesta — error

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Descripción legible por humanos",
    "details": [ ... ]   // opcional: errores de validación campo a campo
  }
}
```

### Paginación

```
Request:  GET /endpoint?page=1&limit=20
Response: {
  "data": [...],
  "meta": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "totalPages": 5
  }
}
```

### Tipos de datos

| Tipo | Formato | Ejemplo |
|------|---------|---------|
| Fechas | ISO 8601 UTC | `"2026-09-15T21:30:00Z"` |
| Montos | String decimal | `"87.50"` (NO número float) |
| IDs | CUID string | `"clx1234abc..."` |
| Moneda | ISO 4217 | `"EUR"`, `"USD"` |

---

## Catálogo de errores

| Código | HTTP | Significado |
|--------|------|-------------|
| `VALIDATION_ERROR` | 400 | Datos de entrada inválidos |
| `UNAUTHORIZED` | 401 | Sin token o token inválido/expirado |
| `FORBIDDEN` | 403 | Sin permiso para este recurso |
| `NOT_FOUND` | 404 | Recurso no encontrado |
| `CONFLICT` | 409 | Conflicto (ej: email ya existe) |
| `RATE_LIMIT` | 429 | Demasiadas peticiones |
| `INTERNAL_ERROR` | 500 | Error interno del servidor |
| `USER_NOT_IN_GROUP` | 403 | El usuario no pertenece al grupo |
| `INSUFFICIENT_ROLE` | 403 | El usuario no tiene el rol requerido |
| `SPLIT_SUM_MISMATCH` | 422 | Los splits no suman el total del gasto |
| `SELF_PAYMENT` | 422 | Un usuario no puede pagarse a sí mismo |

---

## Auth `/api/v1/auth`

### POST /register

Crea una nueva cuenta con email y contraseña.

**Request:**
```json
{
  "name": "Ana García",
  "email": "ana@example.com",
  "password": "Password123"
}
```

**Validaciones:**
- `name`: min 2, max 50 caracteres
- `email`: formato válido, único en BD
- `password`: min 8 chars, ≥1 mayúscula, ≥1 número

**Response 201:**
```json
{
  "data": {
    "user": {
      "id": "clx...",
      "name": "Ana García",
      "email": "ana@example.com",
      "avatarUrl": null,
      "locale": "es",
      "theme": "system"
    },
    "accessToken": "eyJhbGc..."
  }
}
```
*Refresh token devuelto en `Set-Cookie: rt=...; HttpOnly; SameSite=Strict`*

**Errores posibles:** `VALIDATION_ERROR`, `CONFLICT` (email ya existe)

---

### POST /login

Inicia sesión con email y contraseña.

**Request:**
```json
{
  "email": "ana@example.com",
  "password": "Password123"
}
```

**Response 200:** Igual que `/register`

**Errores posibles:** `VALIDATION_ERROR`, `UNAUTHORIZED` (credenciales incorrectas)

---

### POST /refresh

Obtiene un nuevo access token usando el refresh token (cookie).

**Request:** Sin body. El refresh token se lee de la cookie `rt`.

**Response 200:**
```json
{
  "data": {
    "accessToken": "eyJhbGc..."
  }
}
```

**Errores posibles:** `UNAUTHORIZED` (refresh token inválido/expirado/revocado)

---

### POST /logout

Revoca el refresh token actual.

**Request:** Sin body.

**Response 200:**
```json
{ "data": { "message": "Sesión cerrada correctamente" } }
```

---

### GET /google

Redirige al usuario al flujo de OAuth de Google. No retorna JSON.

---

### GET /google/callback

Callback OAuth. Redirige al frontend con el access token como query param.

---

## Users `/api/v1/users`

### GET /me

Devuelve el perfil del usuario autenticado.

**Response 200:**
```json
{
  "data": {
    "id": "clx...",
    "name": "Ana García",
    "email": "ana@example.com",
    "avatarUrl": "https://...",
    "locale": "es",
    "theme": "dark",
    "createdAt": "2026-04-08T10:00:00Z"
  }
}
```

---

### PATCH /me

Actualiza nombre, avatar, locale o theme.

**Request:** (todos los campos son opcionales)
```json
{
  "name": "Ana G.",
  "locale": "en",
  "theme": "dark"
}
```

**Response 200:** El usuario actualizado (mismo formato que GET /me)

---

## Groups `/api/v1/groups`

### GET /

Lista todos los grupos del usuario autenticado.

**Response 200:**
```json
{
  "data": [
    {
      "id": "clx...",
      "name": "Viaje a Lisboa",
      "emoji": "✈️",
      "currency": "EUR",
      "memberCount": 4,
      "myBalance": "-45.50",
      "updatedAt": "2026-09-20T10:00:00Z"
    }
  ]
}
```

---

### POST /

Crea un nuevo grupo. El creador se convierte en ADMIN automáticamente.

**Request:**
```json
{
  "name": "Viaje a Lisboa",
  "description": "Septiembre 2026",
  "emoji": "✈️",
  "currency": "EUR"
}
```

**Validaciones:**
- `name`: min 2, max 60 caracteres
- `currency`: código ISO 4217 válido

**Response 201:**
```json
{
  "data": {
    "id": "clx...",
    "name": "Viaje a Lisboa",
    "emoji": "✈️",
    "currency": "EUR",
    "inviteCode": "abc123xyz",
    "members": [
      {
        "userId": "clx...",
        "name": "Ana García",
        "avatarUrl": null,
        "role": "ADMIN",
        "joinedAt": "2026-04-08T10:00:00Z"
      }
    ],
    "createdAt": "2026-04-08T10:00:00Z"
  }
}
```

---

### GET /:groupId

Detalle del grupo. Solo accesible para miembros del grupo.

**Response 200:**
```json
{
  "data": {
    "id": "clx...",
    "name": "Viaje a Lisboa",
    "emoji": "✈️",
    "currency": "EUR",
    "inviteCode": "abc123xyz",
    "members": [...],
    "expenseCount": 12,
    "totalSpent": "543.20",
    "createdAt": "2026-04-08T10:00:00Z"
  }
}
```

---

### POST /:groupId/members/join

Unirse a un grupo usando el código de invitación.

**Request:**
```json
{ "inviteCode": "abc123xyz" }
```

**Response 200:** El grupo al que se ha unido (mismo formato que GET /:groupId)

**Errores:** `NOT_FOUND` (código inválido), `CONFLICT` (ya es miembro)

---

### DELETE /:groupId/members/:userId

Expulsar a un miembro (solo ADMIN).

**Response 200:**
```json
{ "data": { "message": "Miembro eliminado del grupo" } }
```

---

## Expenses `/api/v1/groups/:groupId/expenses`

### GET /

Lista los gastos del grupo, paginado.

**Query params:**
- `page`, `limit` — paginación
- `categoryId` — filtrar por categoría
- `payerId` — filtrar por pagador
- `from`, `to` — filtrar por rango de fechas (ISO 8601)

**Response 200:**
```json
{
  "data": [
    {
      "id": "clx...",
      "title": "Cena en el puerto",
      "amount": "87.50",
      "currency": "EUR",
      "splitType": "EQUAL",
      "payer": {
        "id": "clx...",
        "name": "Ana García",
        "avatarUrl": null
      },
      "category": {
        "id": "clx...",
        "name": "Comida y bebida",
        "emoji": "🍽️"
      },
      "myShare": "29.17",
      "date": "2026-09-15T21:30:00Z"
    }
  ],
  "meta": { "total": 12, "page": 1, "limit": 20, "totalPages": 1 }
}
```

---

### POST /

Crea un nuevo gasto en el grupo.

**Request — splitType EQUAL:**
```json
{
  "title": "Cena en el puerto",
  "amount": "87.50",
  "payerId": "clx-ana",
  "splitType": "EQUAL",
  "participantIds": ["clx-ana", "clx-bob", "clx-carl"],
  "categoryId": "clx-food",
  "date": "2026-09-15T21:30:00Z",
  "notes": "Incluye propina"
}
```

**Request — splitType EXACT:**
```json
{
  "title": "Hotel (habitaciones distintas)",
  "amount": "240.00",
  "payerId": "clx-ana",
  "splitType": "EXACT",
  "splits": [
    { "userId": "clx-ana",  "amount": "80.00" },
    { "userId": "clx-bob",  "amount": "90.00" },
    { "userId": "clx-carl", "amount": "70.00" }
  ]
}
```

**Request — splitType PERCENTAGE:**
```json
{
  "title": "Alquiler de coche",
  "amount": "150.00",
  "payerId": "clx-bob",
  "splitType": "PERCENTAGE",
  "splits": [
    { "userId": "clx-ana",  "percentage": "50" },
    { "userId": "clx-bob",  "percentage": "30" },
    { "userId": "clx-carl", "percentage": "20" }
  ]
}
```

**Request — splitType SHARES:**
```json
{
  "title": "Supermercado",
  "amount": "60.00",
  "payerId": "clx-carl",
  "splitType": "SHARES",
  "splits": [
    { "userId": "clx-ana",  "shares": 2 },
    { "userId": "clx-bob",  "shares": 1 },
    { "userId": "clx-carl", "shares": 1 }
  ]
}
```

**Response 201:**
```json
{
  "data": {
    "id": "clx...",
    "title": "Cena en el puerto",
    "amount": "87.50",
    "currency": "EUR",
    "splitType": "EQUAL",
    "payer": { "id": "...", "name": "Ana García" },
    "splits": [
      { "userId": "clx-ana",  "name": "Ana",  "amount": "29.17", "isPaid": true  },
      { "userId": "clx-bob",  "name": "Bob",  "amount": "29.17", "isPaid": false },
      { "userId": "clx-carl", "name": "Carl", "amount": "29.16", "isPaid": false }
    ],
    "date": "2026-09-15T21:30:00Z"
  }
}
```

**Errores:** `SPLIT_SUM_MISMATCH`, `USER_NOT_IN_GROUP` (si algún userId no pertenece al grupo)

---

### DELETE /:expenseId

Elimina un gasto (soft delete). Solo el pagador o un ADMIN.

**Response 200:**
```json
{ "data": { "message": "Gasto eliminado" } }
```

---

## Balances `/api/v1/groups/:groupId/balances`

### GET /

Balance neto de cada miembro del grupo.

**Response 200:**
```json
{
  "data": {
    "members": [
      {
        "user": { "id": "clx-ana", "name": "Ana García" },
        "balance": "58.33",
        "isCreditor": true
      },
      {
        "user": { "id": "clx-bob", "name": "Bob" },
        "balance": "-29.17",
        "isCreditor": false
      },
      {
        "user": { "id": "clx-carl", "name": "Carl" },
        "balance": "-29.16",
        "isCreditor": false
      }
    ],
    "currency": "EUR",
    "totalExpenses": "87.50"
  }
}
```

---

### GET /simplified

Deudas simplificadas con el mínimo número de transferencias.

**Response 200:**
```json
{
  "data": {
    "debts": [
      {
        "from": { "id": "clx-bob",  "name": "Bob",  "avatarUrl": null },
        "to":   { "id": "clx-ana",  "name": "Ana",  "avatarUrl": null },
        "amount": "29.17"
      },
      {
        "from": { "id": "clx-carl", "name": "Carl", "avatarUrl": null },
        "to":   { "id": "clx-ana",  "name": "Ana",  "avatarUrl": null },
        "amount": "29.16"
      }
    ],
    "allSettled": false,
    "currency": "EUR"
  }
}
```

Si `allSettled: true`, `debts` es un array vacío.

---

### GET /me

Mi balance personal en el grupo.

**Response 200:**
```json
{
  "data": {
    "myBalance": "58.33",
    "iOwe": [],
    "theyOweMe": [
      { "user": { "id": "...", "name": "Bob" }, "amount": "29.17" },
      { "user": { "id": "...", "name": "Carl" }, "amount": "29.16" }
    ],
    "currency": "EUR"
  }
}
```

---

## Payments `/api/v1/groups/:groupId/payments`

### GET /

Historial de pagos del grupo.

**Response 200:**
```json
{
  "data": [
    {
      "id": "clx...",
      "sender": { "id": "...", "name": "Bob" },
      "receiver": { "id": "...", "name": "Ana" },
      "amount": "29.17",
      "currency": "EUR",
      "notes": "Transferencia",
      "date": "2026-09-20T10:00:00Z"
    }
  ]
}
```

---

### POST /

Registra un pago manual entre dos miembros.

**Request:**
```json
{
  "senderId": "clx-bob",
  "receiverId": "clx-ana",
  "amount": "29.17",
  "notes": "Transferencia Bizum",
  "date": "2026-09-20T10:00:00Z"
}
```

**Response 201:** El pago creado (mismo formato que GET /)

**Errores:** `SELF_PAYMENT`, `USER_NOT_IN_GROUP`

---

## Notifications `/api/v1/notifications`

### GET /

Mis notificaciones.

**Query params:** `read=true|false|all` (default: all), `limit`, `page`

**Response 200:**
```json
{
  "data": [
    {
      "id": "clx...",
      "type": "EXPENSE_ADDED",
      "title": "Nuevo gasto en Viaje a Lisboa",
      "body": "Ana añadió 'Cena en el puerto' (87.50 EUR)",
      "data": { "groupId": "clx...", "expenseId": "clx..." },
      "readAt": null,
      "createdAt": "2026-09-15T22:00:00Z"
    }
  ],
  "meta": { "unreadCount": 3, ... }
}
```

---

### POST /read

Marcar notificaciones como leídas.

**Request:**
```json
{
  "notificationIds": ["clx...", "clx..."]   // o "all" para marcar todas
}
```

**Response 200:**
```json
{ "data": { "markedAsRead": 3 } }
```

---

*Documento mantenido por: Documentation Engineer + Backend Senior*
*Próxima actualización: al inicio de Fase 2 (implementación)*
