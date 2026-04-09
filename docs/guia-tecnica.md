# Guía Técnica de SplitMate — Qué hemos construido y por qué

> Escrita para entender el proyecto como si lo hubieras hecho tú mismo a mano.

---

## 1. ¿Qué es SplitMate?

Una app web para gestionar gastos compartidos entre amigos. Permite:
- Crear grupos (viaje, piso, cenas...)
- Añadir gastos y dividirlos de distintas formas
- Ver quién le debe qué a quién (balances simplificados)
- Registrar pagos para saldar deudas
- Ver estadísticas, presupuestos y notificaciones

---

## 2. Estructura del proyecto (Monorepo)

El proyecto vive en una sola carpeta con tres paquetes internos:

```
AppGastos/
├── apps/
│   ├── api/        ← Servidor backend (Node.js + Express)
│   └── web/        ← Frontend (React + Vite)
└── packages/
    └── shared/     ← Código compartido entre api y web (schemas Zod)
```

**¿Por qué monorepo?** Porque `api` y `web` comparten los mismos tipos TypeScript y schemas de validación (en `packages/shared`). Si cambiamos un endpoint, el frontend lo detecta como error de TypeScript antes de desplegar.

**Herramienta usada: pnpm + Turborepo**
- `pnpm` gestiona los paquetes. Es más rápido que npm y usa menos disco.
- `Turborepo` coordina los builds: sabe que para buildear `web` primero hay que buildear `shared`.

---

## 3. El Backend (apps/api)

### Stack
- **Node.js + Express** — servidor HTTP
- **TypeScript** — tipado estático, evita errores en runtime
- **Prisma** — ORM que habla con la base de datos PostgreSQL
- **Zod** — validación de datos de entrada
- **JWT** — autenticación sin sesiones en servidor
- **Redis** — caché para respuestas frecuentes (balances)
- **Pino** — logs estructurados en JSON

### Arquitectura: Vertical Slice Architecture (VSA)

En vez de organizar por tipo de archivo (todos los controladores juntos, todos los servicios juntos...), organizamos por **feature**:

```
src/slices/
├── auth/           ← Todo lo de autenticación junto
├── groups/         ← Todo lo de grupos junto
├── expenses/       ← Todo lo de gastos junto
├── balances/       ← Todo lo de balances junto
└── ...
```

Cada slice tiene:
- `*.router.ts` — define las rutas HTTP (GET /groups, POST /groups, etc.)
- `*.service.ts` — lógica de negocio
- `*.repository.ts` — acceso a base de datos
- `*.handler.ts` — conecta HTTP con el service

**¿Por qué VSA?** Cuando modificas la feature de "gastos", solo tocas la carpeta `expenses/`. No hay que saltar entre 5 carpetas distintas.

### Base de datos: PostgreSQL con Prisma

El schema define las tablas en `apps/api/prisma/schema.prisma`. Las principales:

- **users** — cuenta de usuario (email, password hash, avatar)
- **groups** — grupos de gasto (nombre, emoji, moneda, límite de deuda)
- **group_members** — quién está en qué grupo y con qué rol (admin/member)
- **expenses** — gastos (importe, descripción, categoría, tipo de split)
- **expense_splits** — cómo se divide cada gasto entre los participantes
- **payments** — pagos manuales para saldar deudas
- **notifications** — notificaciones in-app
- **budgets** — presupuestos por categoría y período
- **oauth_accounts** — cuentas de Google vinculadas
- **refresh_tokens** — tokens de renovación de sesión

**¿Por qué PostgreSQL y no MySQL o MongoDB?**
- PostgreSQL es más estricto con los tipos de datos (mejor para dinero con `DECIMAL`)
- Soporta transacciones ACID (importante cuando movemos dinero)
- Es gratuito en Railway

**Migraciones**: cada cambio de schema genera un archivo SQL en `prisma/migrations/`. Nunca se modifica la BD a mano — siempre a través de migraciones para que producción y desarrollo estén sincronizados.

### Autenticación: JWT + Refresh Tokens

El flujo es:
1. Usuario hace login → API devuelve **access token** (dura 15 min) + **refresh token** (dura 7 días)
2. El access token viaja en cada petición como `Authorization: Bearer <token>`
3. Cuando el access token expira, el frontend usa el refresh token para obtener uno nuevo
4. El refresh token se guarda en una cookie `httpOnly` (no accesible por JavaScript, más seguro)

**¿Por qué no sesiones en servidor?** Porque JWT permite escalar horizontalmente — cualquier instancia del servidor puede verificar el token sin consultar una BD central.

**¿Por qué refresh tokens?** Si el access token durase 7 días y alguien lo robase, tendría acceso durante 7 días. Con 15 minutos, el daño es mucho menor.

### Google OAuth

El flujo de "Entrar con Google":
1. Usuario hace click en el botón
2. Frontend redirige a `/api/v1/auth/google` en Railway
3. La API redirige a Google con nuestro `GOOGLE_CLIENT_ID`
4. Google muestra su pantalla de autorización
5. Usuario acepta → Google redirige a nuestro callback en Railway
6. Railway verifica con el `GOOGLE_CLIENT_SECRET` y obtiene el perfil del usuario
7. Creamos/encontramos el usuario en nuestra BD
8. Generamos JWT y redirigimos al frontend con el token en la URL
9. Frontend guarda el token y lleva al usuario a la app

**Herramienta: Passport.js** — librería que abstrae los diferentes proveedores OAuth (Google, GitHub, etc.)

### Balances: cálculo en runtime

No guardamos el balance de cada usuario en la BD. Lo calculamos cada vez que se pide. El algoritmo:
1. Suma todos los gastos: quién pagó cuánto
2. Resta lo que le corresponde a cada uno según los splits
3. El resultado es el balance neto de cada persona
4. Un segundo algoritmo "simplifica" las deudas: en vez de 10 transferencias entre 5 personas, calcula el mínimo número de pagos necesarios

**¿Por qué en runtime?** Porque si guardásemos el balance y alguien borra un gasto, habría que recalcular y actualizar todos los registros. Es más fácil y seguro calcularlo siempre desde los datos originales.

### Redis: caché

Redis guarda en memoria los resultados de los endpoints más consultados (como los balances). Si 10 usuarios piden el balance del mismo grupo en 1 segundo, solo se hace 1 consulta a PostgreSQL.

---

## 4. El Frontend (apps/web)

### Stack
- **React 18** — librería de UI basada en componentes
- **Vite** — bundler ultrarrápido para desarrollo
- **TypeScript** — mismos tipos que el backend
- **TanStack Query (React Query)** — gestión de estado del servidor
- **Zustand** — estado global del cliente (usuario logueado)
- **React Hook Form + Zod** — formularios con validación
- **Tailwind CSS** — estilos mediante clases utilitarias
- **shadcn/ui** — componentes base (botones, inputs, modales)
- **React Router** — navegación entre páginas
- **i18next** — internacionalización (español e inglés)

### Arquitectura: también Vertical Slices

Igual que el backend, el frontend se organiza por features:

```
src/slices/
├── auth/           ← Login, register, OAuth callback
├── groups/         ← Listado, detalle, miembros
├── expenses/       ← Lista, crear, editar, borrar
├── balances/       ← Balances simplificados, saldar
├── budgets/        ← Presupuestos por categoría
├── notifications/  ← Campana, feed de notificaciones
├── stats/          ← Gráficas y estadísticas
└── activity/       ← Historial de actividad
```

### React Query: por qué es clave

React Query gestiona todo el "estado del servidor" (datos que vienen de la API). Sin él, tendríamos que gestionar manualmente: loading, error, datos, refetch, caché...

Ejemplo: cuando creas un gasto, React Query:
1. Hace la petición POST a la API
2. En el `onSuccess`, invalida la caché de gastos de ese grupo
3. React Query refetcha automáticamente la lista de gastos
4. La UI se actualiza sin que el usuario tenga que refrescar

**Cache invalidation**: cada mutation invalida las queries relacionadas usando claves de prefijo. `['expenses', groupId]` invalida TODOS los gastos de ese grupo sin importar los filtros activos.

### Zustand: estado del usuario logueado

Solo guardamos en Zustand lo que es del cliente y no del servidor: el usuario actual y su access token. Es mucho más simple que Redux.

### El proxy de Vercel

El frontend llama a `/api/v1/...` con rutas relativas. En desarrollo, Vite tiene un proxy local que redirige esas peticiones a `localhost:3000`. En producción, el `vercel.json` tiene una regla de rewrite que redirige `/api/*` al servidor de Railway. El navegador nunca sabe que hay dos servidores.

---

## 5. El despliegue

### Infraestructura

```
[Usuario] → [Vercel CDN] → [React App (SPA)]
                ↓ /api/*
           [Railway] → [API Node.js]
                ↓           ↓
         [PostgreSQL]    [Redis]
```

- **Vercel**: sirve el frontend. Es una CDN global, el HTML/JS se sirve desde el servidor más cercano al usuario. Gratis para proyectos personales.
- **Railway**: aloja la API, PostgreSQL y Redis. Los tres servicios están en la misma red interna de Railway, así que se comunican sin pasar por internet.

### Docker (apps/api/Dockerfile)

La API se despliega como un contenedor Docker. El Dockerfile tiene 3 etapas:

1. **deps** — instala todas las dependencias (incluidas las de desarrollo)
2. **builder** — compila TypeScript → JavaScript
3. **runner** — imagen final de producción: instala solo dependencias de producción, copia el JS compilado

**¿Por qué multi-etapa?** Para que la imagen final sea pequeña. El compilador TypeScript (tsx, typescript) no se incluye en producción.

### Problema resuelto: pnpm + Prisma en Docker

pnpm usa un sistema de "virtual store" donde los paquetes se guardan en `.pnpm/` con symlinks. Cuando Docker copia `node_modules`, los symlinks se rompen. Solución: en el runner, hacemos un `pnpm install --prod` fresco (pnpm recrea los symlinks correctamente) y ejecutamos `prisma generate` para regenerar el cliente de Prisma.

### GitHub Actions (CI)

Cada push a `main` ejecuta:
1. `pnpm lint` — verifica el estilo del código
2. `pnpm typecheck` — verifica los tipos TypeScript
3. Vercel y Railway detectan el push y despliegan automáticamente

---

## 6. Seguridad implementada

- **HTTPS** en todos los entornos (Vercel y Railway lo fuerzan)
- **Helmet.js** — añade headers de seguridad HTTP (Content-Security-Policy, X-Frame-Options...)
- **Rate limiting** — máximo 100 peticiones por 15 minutos por IP en general, 10 en endpoints de auth
- **CORS** — solo acepta peticiones del dominio de Vercel
- **Cookies httpOnly** — el refresh token no es accesible por JavaScript
- **bcrypt** — las contraseñas nunca se guardan en texto plano (se hashean con coste 12)
- **IDOR protection** — verificación de que el usuario pertenece al grupo antes de cada operación
- **Soft delete** — los gastos borrados no se eliminan físicamente, solo se marcan como borrados

---

## 7. Variables de entorno

Variables que necesita la API en producción (Railway):

| Variable | Descripción |
|----------|-------------|
| `DATABASE_URL` | URL de conexión a PostgreSQL |
| `REDIS_URL` | URL de conexión a Redis |
| `JWT_SECRET` | Clave secreta para firmar los JWT (mínimo 32 caracteres) |
| `JWT_ACCESS_EXPIRES` | Duración del access token (ej: `15m`) |
| `JWT_REFRESH_EXPIRES` | Duración del refresh token (ej: `7d`) |
| `GOOGLE_CLIENT_ID` | ID de la app en Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | Secreto de la app en Google Cloud Console |
| `GOOGLE_CALLBACK_URL` | URL de callback OAuth en Railway |
| `FRONTEND_URL` | URL del frontend en Vercel (para el redirect post-OAuth) |
| `CORS_ORIGIN` | URL del frontend (para las cabeceras CORS) |
| `NODE_ENV` | `production` |

---

## 8. URLs de producción

| Servicio | URL |
|----------|-----|
| Frontend | https://splitmate-q82o4payr-vialsadev-beeps-projects.vercel.app |
| API | https://splitmate-production-9842.up.railway.app |
| Railway Dashboard | https://railway.com/project/88db1d62-c3b4-4e7f-9022-873e60059138 |
| GitHub | https://github.com/vialsadev-beep/splitmate |

---

## 9. Flujo completo de una petición

Ejemplo: usuario añade un gasto de 30€ en un grupo.

1. Usuario rellena el formulario en React (validado con Zod en el cliente)
2. React Query llama a `POST /api/v1/groups/:groupId/expenses`
3. Vercel recibe la petición → la reescribe a Railway
4. Express recibe la petición → middleware de autenticación verifica el JWT
5. Middleware de autorización verifica que el usuario pertenece al grupo
6. Zod valida el body de la petición (validación del servidor)
7. `expenses.service` calcula los splits según el tipo elegido (igual, exacto, %)
8. `expenses.repository` guarda el gasto y los splits en PostgreSQL (transacción)
9. Se lanza `checkDebtLimitNotifications()` en background (si hay límite de deuda configurado)
10. La API responde con el gasto creado
11. React Query invalida la caché de gastos y balances
12. La lista de gastos y el tab de balances se actualizan automáticamente

---

*Documento generado el 2026-04-09. Mantenido en `docs/guia-tecnica.md`.*
