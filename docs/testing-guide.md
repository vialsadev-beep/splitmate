# 🧪 Guía de Testing — SplitMate

> Autor: QA Engineer
> Última revisión: 2026-04-08
> Estado: Estrategia definida (implementación en Fase 2)

---

## Filosofía de testing

> "No se hace merge a main si los tests de integración no pasan."
> — Regla QA, aprobada en Fase 1

- Los tests no son opcionales — son parte de la definición de "hecho"
- Preferimos tests de integración sobre tests unitarios con mocks
- Los mocks están prohibidos en tests de integración de BD (usamos BD real)
- Un test que no puede fallar no sirve de nada

---

## Pirámide de tests

```
         /\
        /E2E\          Playwright — 2 flujos críticos mínimo
       /──────\
      /  Integ  \      Supertest + BD real — 80% endpoints
     /────────────\
    /    Unit       \  Vitest — 90% en lógica de negocio crítica
   /──────────────────\
```

---

## Tests unitarios (Vitest)

### Qué testear

| Módulo | Cobertura mínima | Por qué |
|--------|-----------------|---------|
| `balances/balances.service.ts` | 90% | Algoritmo crítico para la app |
| `expenses/expenses.service.ts` | 80% | Lógica de splits |
| `shared/utils/currency.ts` | 100% | Operaciones financieras |
| `shared/utils/date.ts` | 80% | Formateo consistente |
| Schemas Zod | 80% | Validaciones del contrato |

### Casos obligatorios para el algoritmo de simplificación

```typescript
describe('balances.service - simplifyDebts', () => {
  // Casos base
  it('dos personas: A debe a B')
  it('dos personas: ya están saldados')
  it('tres personas en cadena: A→B, B→C → simplifica a A→C + A→B')

  // Casos con múltiples acreedores/deudores
  it('un acreedor, varios deudores')
  it('varios acreedores, un deudor')
  it('varios acreedores, varios deudores')

  // Casos edge
  it('balance neto cero para todos → array vacío')
  it('un solo miembro en el grupo')
  it('montos con decimales (0.01 precision)')
  it('montos muy grandes (9999999.99)')
  it('deudas circulares se simplifican correctamente')
  it('el resultado siempre suma cero (conservación)')
  it('el número de transferencias es mínimo')

  // Invariantes matemáticas
  it('suma de todos los balances netos = 0')
  it('suma de amounts en debts = suma de balances negativos')
})
```

### Casos obligatorios para splits

```typescript
describe('expenses.service - calculateSplits', () => {
  it('EQUAL: divide exactamente entre todos los participantes')
  it('EQUAL: el residuo decimal se asigna al primer participante')
  it('EQUAL: subset de miembros (excluir algunos)')
  it('EXACT: suma de splits == amount del gasto')
  it('EXACT: lanza error si la suma no cuadra')
  it('PERCENTAGE: suma de porcentajes == 100')
  it('PERCENTAGE: lanza error si no suma 100')
  it('SHARES: reparto proporcional correcto')
  it('el pagador siempre aparece con isPaid=true')
})
```

---

## Tests de integración (Supertest)

### Setup

```typescript
// Cada suite de integración usa una BD de test aislada
// Seed mínimo antes de cada test: un usuario, un grupo
// Cleanup después de cada suite: truncate tables

beforeAll(async () => {
  await prisma.$connect()
  await seedTestData()  // usuario + grupo de prueba
})

afterAll(async () => {
  await prisma.$executeRaw`TRUNCATE TABLE ...`
  await prisma.$disconnect()
})
```

### Cobertura requerida por endpoint

**Auth:**
```
POST /auth/register
  ✅ registro exitoso devuelve user + accessToken
  ✅ email duplicado devuelve 409 CONFLICT
  ✅ password débil devuelve 400 VALIDATION_ERROR
  ✅ email mal formado devuelve 400

POST /auth/login
  ✅ credenciales correctas → 200 con tokens
  ✅ contraseña incorrecta → 401
  ✅ email no existe → 401
  ✅ rate limit: 10 intentos → 429

POST /auth/refresh
  ✅ refresh token válido → nuevo accessToken
  ✅ refresh token expirado → 401
  ✅ refresh token revocado → 401
  ✅ rotación: el token usado queda revocado
```

**Groups:**
```
POST /groups
  ✅ crea grupo y asigna rol ADMIN al creador
  ✅ inviteCode se genera automáticamente

GET /groups/:groupId
  ✅ miembro puede acceder
  ✅ no-miembro recibe 403

POST /groups/:groupId/members/join
  ✅ código válido → se une como MEMBER
  ✅ código inválido → 404
  ✅ ya es miembro → 409
```

**Expenses:**
```
POST /groups/:groupId/expenses
  ✅ EQUAL: split correcto y registrado
  ✅ EXACT: sum(splits) != amount → 422 SPLIT_SUM_MISMATCH
  ✅ userId no miembro del grupo → 403
  ✅ solo ADMIN o payer puede eliminar

GET /groups/:groupId/expenses
  ✅ paginación funciona
  ✅ filtro por fecha funciona
  ✅ no devuelve expenses soft-deleted
```

**Balances:**
```
GET /groups/:groupId/balances/simplified
  ✅ grupo sin gastos → debts vacío, allSettled=true
  ✅ después de añadir gasto → balance correcto
  ✅ después de pago → balance actualizado
  ✅ suma de balances netos = 0
```

---

## Tests E2E (Playwright)

### Flujo crítico 1 — Nuevo usuario hasta primer balance

```
1. Navegar a la app
2. Hacer clic en "Registrarse"
3. Completar formulario (nombre, email, contraseña)
4. Ser redirigido al dashboard (grupos vacíos)
5. Crear nuevo grupo "Viaje de prueba"
6. Copiar link de invitación
7. Añadir gasto "Cena" de 90€ (split igual, 3 personas)
8. Navegar a "Balance"
9. Verificar que aparece la deuda correcta
```

**Criterio de éxito:** Todo el flujo en < 60 segundos. Balance es "30.00 EUR" para cada uno.

### Flujo crítico 2 — Saldar deuda

```
1. Login con usuario existente que tiene deuda
2. Navegar al grupo con deuda
3. Abrir pantalla de balance simplificado
4. Hacer clic en "Saldar" en la deuda con Bob
5. Confirmar importe (pre-rellenado)
6. Confirmar pago
7. Verificar que la deuda desaparece del balance
8. Verificar que aparece en historial de pagos
```

**Criterio de éxito:** Deuda desaparece del balance simplificado. El historial muestra el pago.

### Configuración de viewports obligatorios

```typescript
// Todos los tests E2E deben pasar en:
const viewports = [
  { name: 'iPhone 14',    width: 390,  height: 844 },  // móvil prioritario
  { name: 'iPad',         width: 768,  height: 1024 }, // tablet
  { name: 'Desktop',      width: 1280, height: 800 },  // desktop
]
```

---

## CI/CD — Política de tests

```yaml
# GitHub Actions — en cada PR y push a main

jobs:
  test:
    steps:
      - lint + typecheck         # falla rápido
      - unit tests (Vitest)      # falla si cobertura < mínimos
      - integration tests        # usa docker-compose.test.yml
      - e2e tests (Playwright)   # flujos críticos solamente en CI

  # El merge a main está bloqueado si algún job falla
```

### Regla de calidad (QA veto)

El QA Engineer tiene poder de veto sobre cualquier PR que:
- Reduzca la cobertura de tests por debajo del mínimo
- Elimine tests existentes sin justificación
- Añada lógica de negocio en `balances/` o `expenses/` sin tests correspondientes
- Introduzca mocks de BD en tests de integración

---

## Herramientas y configuración

```typescript
// vitest.config.ts
export default {
  test: {
    coverage: {
      provider: 'v8',
      thresholds: {
        'src/slices/balances/**': { lines: 90 },
        'src/slices/expenses/**': { lines: 80 },
        'src/shared/utils/**':    { lines: 80 },
      }
    }
  }
}
```

```typescript
// playwright.config.ts
export default {
  projects: [
    { name: 'mobile-chrome',  use: { ...devices['iPhone 14'] } },
    { name: 'desktop-chrome', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
  }
}
```

---

*Revisado en Fase 1 por: QA, TL, ORC*
*Este documento se actualizará con ejemplos de código real al inicio de Fase 2*
