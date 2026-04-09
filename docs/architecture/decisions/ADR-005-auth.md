# ADR-005: Estrategia de Autenticación

| Campo | Valor |
|-------|-------|
| **ID** | ADR-005 |
| **Título** | JWT Access Token (15min) + Refresh Token (7 días) + Google OAuth |
| **Fecha** | 2026-04-08 |
| **Estado** | ✅ Aprobado |
| **Autor** | Security Engineer |
| **Revisores** | TL, BE, QA |
| **Fase** | 0 — Descubrimiento |

---

## Contexto

La aplicación necesita autenticar usuarios de forma segura y con buena experiencia de usuario. Los usuarios deben permanecer autenticados durante sesiones largas sin tener que re-introducir credenciales, pero el sistema debe ser capaz de revocar el acceso ante compromiso de cuenta.

## Decisión

**Esquema:** JWT Access Token (expira en 15 minutos) + Refresh Token opaco (expira en 7 días)
**Google OAuth:** implementado mediante Passport.js (incluido en MVP)
**Almacenamiento:** Access token en memoria JS del cliente, Refresh token en httpOnly cookie

## Flujo completo

```
┌─────────────────────────────────────────────────────────────┐
│                    FLUJO DE LOGIN                           │
│                                                             │
│  Cliente          →    POST /auth/login                     │
│  Servidor         →    Verifica credenciales                │
│                        Genera access_token (JWT, 15min)     │
│                        Genera refresh_token (opaco, 7d)     │
│                        Guarda refresh_token en BD           │
│  Respuesta        →    { accessToken } + Set-Cookie: rt=... │
│                                                             │
│                    FLUJO DE PETICIÓN AUTENTICADA            │
│                                                             │
│  Cliente          →    GET /api/v1/groups                   │
│                        Authorization: Bearer <access_token>  │
│  Middleware       →    Verifica JWT (sin consultar BD)       │
│  Handler          →    Procesa petición                      │
│                                                             │
│                    FLUJO DE RENOVACIÓN                      │
│                                                             │
│  Cliente (401)    →    POST /auth/refresh                   │
│                        (refresh_token en cookie automática) │
│  Servidor         →    Verifica refresh_token en BD         │
│                        Revoca el refresh_token anterior     │
│                        Genera nuevo access_token            │
│                        Genera nuevo refresh_token (rotación)│
│  Respuesta        →    { accessToken } + nueva cookie       │
│                                                             │
│                    FLUJO DE LOGOUT                          │
│                                                             │
│  Cliente          →    POST /auth/logout                    │
│  Servidor         →    Revoca refresh_token en BD           │
│                        Limpia cookie                        │
└─────────────────────────────────────────────────────────────┘
```

## Justificación técnica

### ¿Por qué JWT para access token?

- **Stateless:** el servidor verifica el token sin consultar la BD — reduces latencia en cada request
- **Escalabilidad horizontal:** múltiples instancias del servidor pueden verificar el mismo token
- **Payload útil:** incluye `userId`, `email`, `role` — evita lookup en BD para datos básicos

### ¿Por qué 15 minutos de expiración?

- Si el access token es robado (XSS, man-in-the-middle), el atacante tiene una ventana máxima de 15 minutos
- El refresh token (httpOnly cookie) es el mecanismo de persistencia seguro
- React Query gestiona la renovación automáticamente mediante interceptor de axios

### ¿Por qué Refresh Token opaco (no JWT)?

- Los refresh tokens deben ser revocables: si el usuario cambia contraseña o detecta acceso no autorizado, puede invalidar todos los refresh tokens
- Un JWT como refresh token no es revocable sin mantener una blacklist (lo que lo hace stateful de todas formas)
- El refresh token opaco se almacena en BD con `revokedAt` — lookup de BD solo en renovación (no en cada request)

### ¿Por qué httpOnly cookie para el refresh token?

- **Protección XSS:** JavaScript del cliente no puede leer el refresh token
- **Automático:** el browser envía la cookie en cada request a la misma origin sin código adicional
- **SameSite=Strict:** previene ataques CSRF

### ¿Por qué Google OAuth?

- Reduce fricción de onboarding (especialmente en móvil)
- Los usuarios no necesitan recordar otra contraseña
- Passport.js simplifica la implementación
- Los usuarios de Google OAuth también tienen refresh tokens en el sistema — el flujo es idéntico post-login

## Alternativas consideradas

### Sessions + Redis (stateful)

```
POST /login → genera session_id → guarda en Redis
Cada request → lookup de session_id en Redis
```

**Por qué se descartó:**
- Requiere consultar Redis en cada request autenticada (latencia extra)
- Más difícil de escalar horizontalmente
- La solución JWT es equivalente en seguridad con mejor performance

### Access token de larga duración (7 días)

**Por qué se descartó (SEC veto potencial):**
- Si un access token es comprometido, el atacante tiene acceso por 7 días
- No hay forma de revocar un JWT sin mantener una blacklist (que lo hace stateful)
- 15 minutos + refresh rotation ofrece revocación efectiva sin overhead

### Solo JWT sin refresh token

**Por qué se descartó:**
- El usuario tendría que hacer login cada 15 minutos
- UX inaceptable para una app de uso diario

### Firebase Auth / Auth0 / Supabase Auth

**Por qué se descartó:**
- Dependencia de servicio externo para funcionalidad crítica
- Coste en escala
- Menor control sobre el flujo
- Para el tamaño del MVP, implementación propia es perfectamente viable

## Implementación de seguridad adicional

### Rate limiting en endpoints de auth

```typescript
// Configuración express-rate-limit
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutos
  max: 10,                    // 10 intentos de login por IP
  message: { error: { code: 'RATE_LIMIT', message: '...' } }
})

app.use('/api/v1/auth/login', authRateLimit)
app.use('/api/v1/auth/register', authRateLimit)
```

### Validación de contraseña

```typescript
// Schema Zod para contraseña
password: z.string()
  .min(8, 'Mínimo 8 caracteres')
  .regex(/[A-Z]/, 'Debe incluir al menos una mayúscula')
  .regex(/[0-9]/, 'Debe incluir al menos un número')
```

### Rotación automática de Refresh Token

Cada vez que se usa un refresh token para obtener un nuevo access token, el refresh token antiguo se revoca y se genera uno nuevo. Esto detecta el uso de tokens robados (si el legítimo intenta renovar después del atacante, encontrará el suyo revocado).

## Consecuencias

### Positivas
- Verificación de access token sin BD lookup (performance óptima en cada request)
- Refresh tokens revocables en BD
- Refresh token inaccesible para JavaScript (httpOnly cookie)
- Rate limiting previene fuerza bruta
- Google OAuth reduce fricción de onboarding

### Negativas / Trade-offs
- El cliente necesita lógica de renovación automática (interceptor axios)
  - Mitigado: implementado en `shared/lib/api-client.ts`, transparente para los slices
- Requiere tabla `refresh_tokens` en BD con limpieza periódica (cron job)
  - Mitigado: job de limpieza de tokens expirados (Fase 3)

---

*Revisado y aprobado en Fase 0 por: ORC, TL, SEC, QA*
