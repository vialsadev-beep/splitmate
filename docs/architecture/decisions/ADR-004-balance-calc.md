# ADR-004: Balance Calculado en Runtime (No Persistido)

| Campo | Valor |
|-------|-------|
| **ID** | ADR-004 |
| **Título** | Estrategia de cálculo de balances: runtime vs persistido |
| **Fecha** | 2026-04-08 |
| **Estado** | ✅ Aprobado |
| **Autor** | DB Architect + Backend Senior |
| **Revisores** | TL, QA, SEC |
| **Fase** | 1 — Arquitectura |

---

## Contexto

La funcionalidad central de la app es mostrar quién debe cuánto a quién. Este dato (el "balance") puede calcularse de dos formas: calculándolo en tiempo real cada vez que se consulta, o persistiéndolo en una tabla que se actualiza cuando cambian los datos subyacentes.

Esta decisión tiene implicaciones directas en la consistencia de datos, la complejidad del código y el rendimiento.

## Decisión

El balance **se calcula en runtime** a partir de los datos primarios (`ExpenseSplit` + `Payment`). No existe ninguna tabla `Balance` en la base de datos.

## Definición del cálculo

```
balance_neto(usuario, grupo) =
    Σ expense_split.amount  [donde expense.groupId = grupo
                              AND expense.payerId = usuario
                              AND split.userId ≠ usuario]        // lo que otros le deben
  - Σ expense_split.amount  [donde expense.groupId = grupo
                              AND split.userId = usuario
                              AND expense.payerId ≠ usuario]     // lo que él debe a otros
  + Σ payment.amount        [donde payment.groupId = grupo
                              AND payment.receiverId = usuario]  // pagos recibidos
  - Σ payment.amount        [donde payment.groupId = grupo
                              AND payment.senderId = usuario]    // pagos enviados
```

Un balance positivo significa que el grupo le debe dinero al usuario.
Un balance negativo significa que el usuario debe dinero al grupo.

## Algoritmo de simplificación

Una vez calculados los balances netos individuales, se aplica el algoritmo greedy para minimizar el número de transferencias:

```
1. acreedores = usuarios con balance_neto > 0, ordenados desc
2. deudores   = usuarios con balance_neto < 0, ordenados asc (más negativo primero)

3. Mientras deudores no esté vacío:
   a. deudor   = deudores[0]
   b. acreedor = acreedores[0]
   c. monto    = min(|deudor.balance|, acreedor.balance)
   d. Añadir transferencia: deudor → acreedor: monto
   e. deudor.balance   += monto
   f. acreedor.balance -= monto
   g. Si deudor.balance == 0: eliminar de deudores
   h. Si acreedor.balance == 0: eliminar de acreedores

4. Retornar lista de transferencias
```

**Propiedad garantizada:** el resultado siempre tiene el mínimo número posible de transferencias para saldar todas las deudas del grupo.

## Alternativas consideradas

### Tabla Balance persistida

```sql
-- Hipotética tabla Balance
balance (
  group_id, user_id, amount, updated_at
)
```

**Problemas identificados:**
1. **Consistencia:** cualquier operación que modifique un gasto (crear, editar, eliminar) debe actualizar la tabla `balance` en la misma transacción. Si hay un bug en la lógica de actualización, el balance puede quedar incorrecto silenciosamente.
2. **Complejidad:** editar un gasto ya existente (ej: cambiar el monto o los participantes) requiere recalcular qué balances cambian y actualizar múltiples filas.
3. **Auditoría:** la tabla balance "miente" — muestra un resumen pero no permite saber por qué ese número. Con el enfoque runtime, siempre se puede rastrear.
4. **Race conditions:** si dos gastos se crean simultáneamente en el mismo grupo, las actualizaciones de balance pueden colisionar.

**Única ventaja:** performance en grupos muy grandes.

**Conclusión:** Los problemas de consistencia superan la ventaja de performance para el MVP.

### Vista materializada (PostgreSQL)

Una vista materializada de PostgreSQL que pre-calcula el balance y se refresca periódicamente.

**Por qué se descartó:**
- El balance necesita ser en tiempo real, no "hace 5 minutos"
- La complejidad de gestionar el refresh manual añade operaciones
- No es compatible con el nivel de abstracción que ofrece Prisma

## Plan de mitigación de performance

El cálculo runtime es eficiente para grupos de 2-50 personas (caso de uso real). Para grupos mayores o alta concurrencia:

### Fase 2 (MVP): sin caché
- Los grupos reales tienen 2-20 personas
- La query es eficiente con los índices definidos
- Umbral estimado de performance aceptable: grupos de hasta 50 personas, <100ms de respuesta

### Fase 3 (Hardening): Redis cache
```
GET /groups/:id/balances/simplified
  → Redis key: balance:group:{groupId}
  → TTL: 30 segundos
  → Invalidación: al crear/editar/eliminar Expense o Payment del grupo
```

Este caché reduce la carga de BD sin comprometer consistencia (30s de stale máximo, aceptable para este tipo de app).

### Fase 4 (si necesario): Materialización selectiva
Si un grupo supera los 200 miembros o 10.000 gastos, evaluar vista materializada o tabla snapshot con refresh por evento.

## Consecuencias

### Positivas
- **Zero inconsistencias:** el balance siempre refleja el estado real de la BD
- **Auditoría natural:** se puede rastrear cualquier balance hasta los gastos individuales
- **Código simple:** no hay lógica de "actualizar balance cuando X cambia"
- **Sin race conditions** en el cálculo
- **Tests triviales:** se testea el algoritmo de cálculo con datos fijos, sin mocks de BD

### Negativas / Trade-offs
- **Performance:** query más costosa que leer una tabla pre-calculada
  - Mitigado: índices bien definidos + Redis cache en Fase 3
- **Complejidad de la query:** la query de balance es compleja
  - Mitigado: encapsulada en `balances.repository.ts`, bien documentada y testeada

---

*Revisado y aprobado en Fase 1 por: ORC, TL, DB, BE, QA*
