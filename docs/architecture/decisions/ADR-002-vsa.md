# ADR-002: Vertical Slice Architecture

| Campo | Valor |
|-------|-------|
| **ID** | ADR-002 |
| **Título** | Vertical Slice Architecture como patrón arquitectónico |
| **Fecha** | 2026-04-08 |
| **Estado** | ✅ Aprobado |
| **Autor** | Tech Lead |
| **Revisores** | PE, BE, FE, QA |
| **Fase** | 0 — Descubrimiento |

---

## Contexto

Se necesita definir el patrón arquitectónico que organizará el código de la aplicación. El proyecto tiene múltiples dominios funcionales independientes (auth, groups, expenses, balances, payments, etc.) que deben poder desarrollarse, testearse y desplegarse de forma autónoma.

## Decisión

Adoptar **Vertical Slice Architecture (VSA)** como patrón arquitectónico principal, tanto en frontend como en backend.

### Definición

En VSA, el código se organiza por **feature** (slice vertical), no por capa técnica (horizontal). Cada slice contiene todo lo necesario para implementar una funcionalidad completa.

### Estructura de un slice (backend)

```
slices/expenses/
├── expenses.router.ts       # Rutas Express del slice
├── expenses.handler.ts      # Controlador — orquesta, no implementa lógica
├── expenses.service.ts      # Lógica de negocio del dominio expenses
├── expenses.repository.ts   # Acceso a BD — solo queries de expenses
├── expenses.schema.ts       # Schemas Zod de validación
├── expenses.types.ts        # Tipos TypeScript del slice
└── expenses.test.ts         # Tests unitarios e integración
```

### Estructura de un slice (frontend)

```
slices/expenses/
├── api/
│   └── expenses.queries.ts  # React Query hooks
├── components/
│   ├── ExpenseForm.tsx
│   ├── ExpenseCard.tsx
│   └── SplitSelector.tsx
├── pages/
│   └── ExpensesPage.tsx
└── types.ts
```

### Regla de oro

```
✅ expenses/expenses.service.ts puede importar:
   - expenses/expenses.repository.ts (mismo slice)
   - shared/lib/prisma.ts (shared kernel)
   - shared/errors/AppError.ts (shared kernel)

❌ expenses/expenses.service.ts NO puede importar:
   - groups/groups.service.ts (otro slice)
   - balances/balances.repository.ts (otro slice)

Si expenses necesita datos de groups →
  el handler recibe groupId como parámetro
  y groups.repository es llamado desde groups.service, no desde expenses
```

### Shared Kernel (lo único compartido)

```
shared/
├── middleware/       # auth, validate, rateLimit, error
├── errors/          # AppError, errorCodes
├── lib/             # prisma, redis, logger
└── utils/           # pagination, date, currency
```

## Alternativas consideradas

### Layered Architecture (MVC)

```
controllers/
  authController.ts
  groupsController.ts
services/
  authService.ts
  groupsService.ts
repositories/
  authRepository.ts
  groupsRepository.ts
```

**Por qué se descartó:**
- Los services acaban siendo "god objects" que conocen múltiples dominios
- Añadir una feature nueva requiere tocar 4-5 carpetas distintas
- Los tests se vuelven interdependientes
- La responsabilidad de cada archivo no está clara

### Domain-Driven Design (DDD) completo

**Por qué se descartó:**
- Overengineering para el tamaño de este proyecto
- Aggregate roots, domain events, etc. añaden complejidad sin beneficio claro
- VSA captura los beneficios de DDD sin la ceremonia

### Feature folders (variante sin repositorio)

Sin capa repository separada del service.

**Por qué se descartó:**
- La separación service/repository permite mockear el acceso a BD en tests unitarios
- Mejora la testabilidad sin añadir complejidad significativa

## Consecuencias

### Positivas
- Cada feature es completamente autónoma y testeable de forma aislada
- Incorporar un nuevo desarrollador es sencillo: el scope está claramente delimitado
- Agregar una nueva feature no requiere modificar código existente
- Los tests de un slice no dependen de otros slices
- La feature puede refactorizarse o reemplazarse sin impacto lateral

### Negativas / Trade-offs
- Cierta duplicación de código es aceptable y preferible al acoplamiento
- Requiere disciplina del equipo para no importar entre slices
- El lint/CI debe verificar que no hay importaciones cruzadas entre slices

### Reglas de enforcement (CI)

Se añadirá una regla de ESLint personalizada que falle si detecta:
```
import * from '../other-slice/...'
```

dentro de un slice. Solo se permiten imports desde el mismo slice o desde `shared/`.

## Notas de implementación

- Los slices se registran en `app.ts` mediante `app.use('/api/v1/expenses', expensesRouter)`
- Los slices de frontend se registran en `router/index.tsx` con lazy loading
- `packages/shared/` contiene los contratos Zod compartidos entre FE y BE (no es un slice, es infraestructura)

---

*Revisado y aprobado en Fase 0/1 por: ORC, TL, PE, QA*
