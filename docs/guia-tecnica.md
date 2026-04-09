# Guía Técnica de SplitMate — Explicado desde cero

> Esta guía explica qué es cada tecnología, para qué sirve y por qué la elegimos.
> Está escrita para alguien que nunca ha usado estas herramientas antes.

---

## Índice

1. [¿Qué hemos construido exactamente?](#1-qué-hemos-construido-exactamente)
2. [La estructura de carpetas](#2-la-estructura-de-carpetas)
3. [Node.js y Express — el servidor](#3-nodejs-y-express--el-servidor)
4. [TypeScript — por qué no usamos JavaScript normal](#4-typescript--por-qué-no-usamos-javascript-normal)
5. [PostgreSQL y Prisma — la base de datos](#5-postgresql-y-prisma--la-base-de-datos)
6. [La autenticación — cómo sabe el servidor quién eres](#6-la-autenticación--cómo-sabe-el-servidor-quién-eres)
7. [Google OAuth — el botón de "Entrar con Google"](#7-google-oauth--el-botón-de-entrar-con-google)
8. [Redis — la memoria rápida](#8-redis--la-memoria-rápida)
9. [React — el frontend](#9-react--el-frontend)
10. [Vite — la herramienta de construcción del frontend](#10-vite--la-herramienta-de-construcción-del-frontend)
11. [React Query — cómo el frontend habla con el servidor](#11-react-query--cómo-el-frontend-habla-con-el-servidor)
12. [Tailwind CSS — los estilos](#12-tailwind-css--los-estilos)
13. [pnpm y el monorepo — cómo está organizado el código](#13-pnpm-y-el-monorepo--cómo-está-organizado-el-código)
14. [Docker — empaquetar la aplicación](#14-docker--empaquetar-la-aplicación)
15. [El despliegue — cómo llega la app a internet](#15-el-despliegue--cómo-llega-la-app-a-internet)
16. [Las variables de entorno — los secretos de la app](#16-las-variables-de-entorno--los-secretos-de-la-app)
17. [Flujo completo — qué pasa cuando añades un gasto](#17-flujo-completo--qué-pasa-cuando-añades-un-gasto)

---

## 1. ¿Qué hemos construido exactamente?

SplitMate es una **aplicación web**. Eso significa que funciona en el navegador, como Gmail o Twitter, sin instalar nada.

Por dentro tiene **dos partes separadas**:

**El frontend** (lo que el usuario ve)
- Es el código que se ejecuta en el navegador del usuario
- Muestra botones, listas, formularios
- Está hecho con React

**El backend / API** (lo que el usuario no ve)
- Es un servidor que está siempre encendido en internet
- Guarda los datos en la base de datos
- Gestiona quién puede ver qué
- Está hecho con Node.js + Express

Cuando abres la app en el navegador, el frontend (React) se descarga en tu ordenador y se ejecuta ahí. Cuando necesita datos (por ejemplo, la lista de gastos), le pregunta al backend. El backend consulta la base de datos y responde.

```
Tu navegador                    Internet                    Servidor
[React App] ---"dame los gastos"--→ [API Express] → [PostgreSQL]
[React App] ←---"aquí están"------- [API Express] ← [PostgreSQL]
```

---

## 2. La estructura de carpetas

```
AppGastos/
├── apps/
│   ├── api/        ← El servidor (backend)
│   └── web/        ← La interfaz visual (frontend)
└── packages/
    └── shared/     ← Código que usan tanto api como web
```

**¿Por qué todo junto en una carpeta?**

Esto se llama **monorepo** (un único repositorio). La alternativa sería tener dos proyectos separados en dos carpetas distintas. El problema con tenerlos separados es que el backend y el frontend necesitan "hablar el mismo idioma" — si el servidor espera recibir `{ amount: number }` y el frontend envía `{ importe: string }`, habrá un error.

Con el monorepo, el código compartido (los formatos de datos, las validaciones) vive en `packages/shared` y tanto el backend como el frontend lo usan. Si cambias el formato de un gasto en shared, TypeScript te avisa en ambos sitios a la vez.

---

## 3. Node.js y Express — el servidor

**Node.js** es un programa que permite ejecutar JavaScript fuera del navegador. Normalmente JavaScript solo funciona en el navegador; Node.js lo lleva al servidor.

Piénsalo así: antes JavaScript era solo para hacer páginas web interactivas. Node.js cogió ese mismo lenguaje y lo puso a funcionar en servidores, como hacen Java o Python.

**Express** es una librería que se instala encima de Node.js y facilita crear un servidor web. Sin Express tendrías que programar desde cero cómo responder a peticiones HTTP. Con Express defines rutas así:

```javascript
// Cuando alguien hace GET /groups, ejecuta esta función
app.get('/groups', (req, res) => {
  res.json({ grupos: [...] })
})
```

**¿Por qué Node.js y no Python, Java, etc.?**
- Usamos TypeScript (que es JavaScript con tipos) tanto en frontend como backend, así que el equipo solo necesita saber un lenguaje
- Node.js es muy bueno manejando muchas peticiones simultáneas (como un restaurante de comida rápida que sirve muchos pedidos a la vez)
- Enorme ecosistema de librerías gratuitas (npm)

---

## 4. TypeScript — por qué no usamos JavaScript normal

JavaScript es un lenguaje muy permisivo. Puedes hacer cosas como:

```javascript
// JavaScript: esto no da error hasta que se ejecuta
let precio = "veinte euros"
let total = precio * 2  // NaN — error silencioso
```

TypeScript es JavaScript con un sistema de tipos encima. Le dices al código qué tipo de dato espera cada variable:

```typescript
// TypeScript: el error se detecta ANTES de ejecutar
let precio: number = "veinte euros"  // ❌ Error: string no es number
let total = precio * 2  // Esto nunca llega a ejecutarse
```

TypeScript es un **compilador**: convierte el código `.ts` a `.js` que el navegador y Node.js pueden ejecutar. Este proceso también verifica que no haya errores de tipos.

**¿Por qué es importante?**

En un proyecto con un backend, un frontend y código compartido, TypeScript garantiza que cuando el servidor dice "voy a devolver un objeto con estas propiedades", el frontend sabe exactamente qué va a recibir. Si el servidor cambia algo y el frontend no se adapta, TypeScript da error antes de desplegar.

---

## 5. PostgreSQL y Prisma — la base de datos

**PostgreSQL** es una base de datos relacional. Guarda los datos en tablas, como hojas de cálculo muy potentes:

```
Tabla "groups" (grupos):
┌────────────────────────────────────────────────┐
│ id       │ name          │ emoji │ currency    │
├──────────┼───────────────┼───────┼─────────────┤
│ abc-123  │ Viaje Roma    │  ✈️   │ EUR         │
│ def-456  │ Piso compartido│ 🏠   │ EUR         │
└────────────────────────────────────────────────┘
```

Las tablas se relacionan entre sí. Un grupo tiene varios miembros, un miembro pertenece a varios grupos, un gasto pertenece a un grupo...

**¿Por qué PostgreSQL y no MySQL, MongoDB, etc.?**
- **vs MySQL**: PostgreSQL tiene mejor soporte para tipos de datos complejos y es más estricto (menos errores silenciosos)
- **vs MongoDB**: MongoDB es una base de datos de documentos (sin tablas fijas). Para datos financieros como gastos y balances, las relaciones entre tablas son importantes y PostgreSQL las gestiona mejor
- **Gratis en Railway** para proyectos pequeños

---

**Prisma** es el puente entre el código TypeScript y la base de datos. Sin Prisma, tendrías que escribir SQL a mano:

```sql
-- Sin Prisma (SQL directo):
SELECT * FROM expenses WHERE group_id = 'abc-123' AND deleted_at IS NULL
```

Con Prisma escribes TypeScript normal:

```typescript
// Con Prisma:
const gastos = await prisma.expense.findMany({
  where: { groupId: 'abc-123', deletedAt: null }
})
```

Prisma también genera automáticamente los tipos TypeScript de cada tabla, así que sabe que un `expense` tiene `amount`, `description`, `payerId`, etc.

**Las migraciones de Prisma**

Cuando cambias la estructura de la base de datos (añadir una columna, crear una tabla nueva), Prisma genera un archivo SQL con los cambios. Esto es una **migración**:

```
prisma/migrations/
├── 20260408_init/migration.sql          ← Crea todas las tablas iniciales
└── 20260409_add_receipt/migration.sql   ← Añade columna "receiptUrl" a expenses
```

Las migraciones sirven para que la base de datos de producción (en Railway) siempre esté sincronizada con el código. Cuando la app arranca, ejecuta automáticamente todas las migraciones pendientes.

---

## 6. La autenticación — cómo sabe el servidor quién eres

Cuando te logeas en SplitMate, el servidor necesita saber quién eres en cada petición posterior. No puede pedirte usuario y contraseña cada vez. Para esto usamos **JWT (JSON Web Tokens)**.

**Cómo funciona:**

1. Escribes tu email y contraseña → el servidor los verifica contra la BD
2. Si son correctos, el servidor genera dos "fichas":
   - **Access token**: una ficha de corta duración (15 minutos) que dice "este usuario es válido"
   - **Refresh token**: una ficha de larga duración (7 días) para renovar el access token

3. El access token se guarda en la memoria del navegador
4. En cada petición, el navegador lo envía: `Authorization: Bearer <token>`
5. El servidor verifica que el token sea válido y extrae el ID del usuario

**¿Qué es un JWT exactamente?**

Un JWT es una cadena de texto codificada en Base64 con tres partes separadas por puntos:

```
eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJhYmMtMTIzIn0.xK8_mNq2oP...
    ↑ Cabecera            ↑ Datos (userId, etc.)     ↑ Firma
```

La **firma** es lo importante: solo el servidor conoce la clave secreta (`JWT_SECRET`) para generarla y verificarla. Si alguien modifica el token, la firma deja de ser válida y el servidor lo rechaza.

**¿Por qué access token de 15 minutos?**

Si alguien roba tu access token (por ejemplo, con un ataque), solo tiene 15 minutos antes de que expire. El refresh token se guarda en una **cookie httpOnly** — este tipo de cookie no es accesible por JavaScript, solo el navegador la envía automáticamente. Eso lo protege de ataques XSS (scripts maliciosos en la página).

---

## 7. Google OAuth — el botón de "Entrar con Google"

OAuth es un protocolo estándar para que usuarios puedan identificarse con una cuenta existente (Google, GitHub, etc.) sin darte su contraseña.

**El flujo paso a paso:**

```
1. Usuario hace click en "Entrar con Google"
        ↓
2. Nuestro servidor redirige a Google
   "Oye Google, quiero autenticar a alguien. Mi ID de app es 904921..."
        ↓
3. Google muestra su pantalla de autorización al usuario
   "¿Permites que SplitMate vea tu nombre y email?"
        ↓
4. Usuario acepta
        ↓
5. Google redirige de vuelta a nuestro servidor con un "código"
   "Aquí tienes el código: xyz123. Canjéalo por la info del usuario"
        ↓
6. Nuestro servidor va a Google con ese código + nuestro secreto
   "Dame la info del usuario con código xyz123. Aquí mi secreto: GOCSPX-..."
        ↓
7. Google devuelve nombre, email y foto del usuario
        ↓
8. Nuestro servidor crea/encuentra al usuario en la BD y genera JWT
        ↓
9. Redirige al frontend con el token
```

**Google Cloud Console** es donde registras tu aplicación con Google. Necesitas:
- Un **Client ID**: el identificador público de tu app (`904921146858-...apps.googleusercontent.com`)
- Un **Client Secret**: la contraseña secreta que solo conoce tu servidor

Si el Client Secret es incorrecto → Google rechaza la petición con "invalid_client".
Si hay un espacio extra en la URL de redirect → Google redirige a una URL incorrecta.

**Librería usada: Passport.js**

Passport.js abstrae todo este proceso. En vez de implementar el protocolo OAuth desde cero, defines una "estrategia":

```typescript
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: 'https://tu-api.railway.app/api/v1/auth/google/callback'
}, (accessToken, refreshToken, profile, done) => {
  // Aquí recibes la info del usuario de Google
  // Creas/encuentras al usuario en tu BD
  // Llamas a done() con el usuario
}))
```

---

## 8. Redis — la memoria rápida

Redis es una base de datos que guarda los datos **en RAM** (memoria del servidor) en vez de en disco. Esto la hace extremadamente rápida pero los datos se pierden si el servidor se reinicia (por eso solo guardamos cosas temporales).

**¿Para qué lo usamos?**

Para **cachear** (guardar temporalmente) los resultados de operaciones costosas. El cálculo de balances requiere sumar todos los gastos y splits de un grupo. Si 50 usuarios consultan el balance al mismo tiempo, sin caché harías 50 consultas pesadas a PostgreSQL.

Con Redis:
- Primera consulta: calcula el balance → lo guarda en Redis por 5 minutos
- Siguientes 49 consultas: devuelve directamente desde Redis (instantáneo)
- Cuando alguien añade un gasto: borra la caché del balance de ese grupo
- Siguiente consulta: recalcula y vuelve a cachear

**¿Por qué Redis y no guardar en una variable del servidor?**

Si el servidor tiene múltiples instancias (varios servidores iguales para repartir carga), cada uno tendría su propia variable. Redis es externo a todos ellos, así que todos ven la misma caché.

---

## 9. React — el frontend

React es una librería de JavaScript para construir interfaces de usuario. La idea central es que la UI se divide en **componentes** reutilizables:

```
GroupDetailPage
├── TopBar (barra superior)
├── TabBar (pestañas: Gastos, Balance, etc.)
└── ExpenseListTab
    ├── SearchBar
    ├── ExpenseCard (se repite por cada gasto)
    │   ├── ExpenseTitle
    │   ├── ExpenseAmount
    │   └── ExpenseActions
    └── EmptyState (si no hay gastos)
```

Cada componente es una función que devuelve HTML. Cuando los datos cambian, React actualiza solo las partes de la pantalla que cambiaron (no recarga toda la página).

**¿Por qué React y no Vue, Angular, o HTML puro?**
- Es el más popular → más librerías disponibles, más ejemplos online
- El modelo de componentes es muy intuitivo para apps complejas
- El equipo ya lo conocía

---

## 10. Vite — la herramienta de construcción del frontend

Cuando desarrollas, Vite levanta un servidor local en `localhost:5173` que:
- Sirve el código TypeScript/React directamente (sin compilar todo)
- Cuando cambias un archivo, actualiza el navegador al instante (Hot Module Replacement)

Cuando vas a desplegar, Vite **construye** el proyecto: convierte todo el TypeScript/React en archivos JavaScript/CSS estáticos optimizados que cualquier navegador puede leer.

```
src/ (código fuente TypeScript)
    ↓ vite build
dist/ (archivos estáticos listos para producción)
├── index.html
├── assets/
│   ├── index-abc123.js    ← Todo el JavaScript comprimido
│   └── index-def456.css   ← Todo el CSS comprimido
```

Estos archivos de `dist/` son los que Vercel sirve a los usuarios.

**El proxy de desarrollo**

En desarrollo, cuando el frontend llama a `/api/v1/groups`, Vite redirige esa petición a `http://localhost:3000` (donde corre el backend). Así el frontend siempre llama a rutas relativas (`/api/...`) sin preocuparse de dónde está el servidor.

En producción, Vercel hace lo mismo: redirige `/api/*` al servidor de Railway.

---

## 11. React Query — cómo el frontend habla con el servidor

React Query (también llamado TanStack Query) gestiona toda la comunicación entre el frontend y el backend. Sin él, tendrías que programar manualmente:
- El estado de carga ("está cargando...")
- El estado de error ("ha fallado")
- La caché (no volver a pedir datos que ya tienes)
- El refetch automático
- La sincronización tras mutaciones

**Los dos conceptos clave:**

**Queries** (lecturas): obtener datos del servidor
```typescript
// "Dame los gastos del grupo abc-123"
const { data, isLoading, isError } = useQuery({
  queryKey: ['expenses', 'abc-123'],  // clave única para cachear
  queryFn: () => apiClient.get('/groups/abc-123/expenses')
})
```
React Query guarda el resultado en una caché. La próxima vez que un componente pide los mismos datos, los devuelve al instante desde la caché mientras actualiza en segundo plano.

**Mutations** (escrituras): enviar datos al servidor
```typescript
// "Crea este gasto"
const createExpense = useMutation({
  mutationFn: (data) => apiClient.post('/groups/abc-123/expenses', data),
  onSuccess: () => {
    // Después de crear el gasto, invalida la caché de gastos
    // para que React Query los vuelva a pedir al servidor
    queryClient.invalidateQueries({ queryKey: ['expenses', 'abc-123'] })
  }
})
```

**El bug que tuvimos y cómo lo arreglamos:**

La clave de caché de los gastos era `['expenses', groupId, { search: 'texto', ... }]`. Cuando invalidábamos usábamos `['expenses', groupId, undefined]` (sin los filtros). React Query no los reconocía como la misma caché porque el tercer elemento era diferente.

La solución fue usar solo `['expenses', groupId]` para invalidar: React Query invalida todo lo que empiece por ese prefijo, independientemente de los filtros.

---

## 12. Tailwind CSS — los estilos

CSS normal se escribe en archivos separados:
```css
/* styles.css */
.boton-primario {
  background-color: blue;
  color: white;
  padding: 8px 16px;
  border-radius: 8px;
}
```

Tailwind CSS funciona con clases utilitarias directamente en el HTML:
```html
<button class="bg-blue-500 text-white px-4 py-2 rounded-lg">
  Crear grupo
</button>
```

Cada clase hace una sola cosa: `bg-blue-500` es el fondo azul, `px-4` es el padding horizontal, `rounded-lg` son las esquinas redondeadas.

**¿Por qué Tailwind?**
- No tienes que inventarte nombres de clases ("¿lo llamo `.boton-azul` o `.btn-primary`?")
- Los estilos viven junto al componente, fácil de leer y modificar
- El archivo CSS final solo incluye las clases que realmente se usan (archivo pequeño)

**shadcn/ui** es una colección de componentes pre-construidos con Tailwind (botones, modales, inputs, etc.) que se copian directamente al proyecto y puedes modificarlos.

---

## 13. pnpm y el monorepo — cómo está organizado el código

**npm, yarn y pnpm** son gestores de paquetes: herramientas para instalar librerías de terceros.

Cuando dices `import express from 'express'`, alguien tuvo que escribir esa librería `express` y publicarla. pnpm la descarga de internet y la guarda en `node_modules/`.

**¿Por qué pnpm y no npm?**
- pnpm es mucho más rápido (usa un almacén central y enlaces simbólicos en vez de copiar archivos)
- Usa menos espacio en disco
- Maneja mejor los monorepos (múltiples paquetes en una carpeta)

**Workspaces**: pnpm permite que `apps/api` y `apps/web` sean "paquetes" separados que se pueden referenciar entre sí. `apps/web` puede importar de `packages/shared` escribiendo simplemente `import { ... } from '@splitmate/shared'`.

**Turborepo** es una herramienta que coordina cómo se construyen los paquetes del monorepo. Sabe que para construir `web` primero hay que construir `shared`. También cachea los resultados: si `shared` no ha cambiado, no lo vuelve a construir.

---

## 14. Docker — empaquetar la aplicación

Docker permite empaquetar una aplicación junto con todo lo que necesita (Node.js, las librerías, la configuración) en una "imagen". Esa imagen se puede ejecutar en cualquier servidor de forma idéntica.

Piénsalo como una **receta de cocina que incluye los ingredientes**: en vez de decir "instala Node.js 20, luego instala estas librerías, luego ejecuta este comando", el Dockerfile define todo eso una vez y Docker lo reproduce exactamente en cualquier máquina.

**El Dockerfile de la API tiene 3 etapas:**

```dockerfile
# Etapa 1: Instalar dependencias
FROM node:20-alpine AS deps
# ... instala todas las librerías (incluidas las de desarrollo)

# Etapa 2: Compilar TypeScript → JavaScript
FROM deps AS builder
# ... ejecuta "tsc" para convertir .ts a .js

# Etapa 3: Imagen final de producción
FROM node:20-alpine AS runner
# ... instala solo librerías de producción
# ... copia el JavaScript compilado
# ... arranca el servidor
```

**¿Por qué tres etapas?**

La imagen final de producción no necesita el compilador TypeScript ni otras herramientas de desarrollo. Con tres etapas, la imagen final es más pequeña (menos megas → arranque más rápido, menos coste).

**El problema que resolvimos: pnpm + Prisma en Docker**

pnpm usa un sistema de archivos especial donde las librerías se guardan en `.pnpm/` y se accede a ellas mediante **symlinks** (accesos directos del sistema operativo). Cuando Docker copia la carpeta `node_modules/`, los symlinks se rompen porque el destino ya no existe en la misma ruta.

Solución: en la imagen de producción, en vez de copiar `node_modules/`, ejecutamos `pnpm install` de nuevo. pnpm reinstala todo correctamente creando los symlinks en su sitio.

**Alpine Linux**

La imagen base es `node:20-alpine`. Alpine es una distribución de Linux ultrapequeña (~5MB vs ~200MB de Ubuntu). Railway factura por uso de recursos, así que imágenes más pequeñas = contenedores más baratos.

---

## 15. El despliegue — cómo llega la app a internet

**La infraestructura completa:**

```
Usuario en el móvil
        ↓
   [Vercel CDN]              ← Sirve el HTML/JS del frontend
        ↓ /api/* (proxy)
  [Railway - API]            ← Servidor Node.js (Express)
     ↓          ↓
[PostgreSQL]  [Redis]        ← Base de datos y caché
```

---

**Vercel** es un servicio que aloja frontends (páginas web estáticas o con SSR). Cuando haces push a GitHub, Vercel detecta el cambio, construye el proyecto automáticamente y lo publica.

Vercel tiene servidores repartidos por todo el mundo (CDN — Content Delivery Network). Cuando alguien en Japón abre la app, recibe los archivos desde el servidor Vercel más cercano a Japón, no desde un servidor en EEUU. Esto hace la app muy rápida.

**El archivo `vercel.json`** configura cómo Vercel maneja las peticiones:
- `/api/*` → redirige a Railway (el backend)
- `/uploads/*` → redirige a Railway (las imágenes subidas)
- Todo lo demás → sirve `index.html` (necesario para que React Router funcione)

---

**Railway** es un servicio que aloja servidores (backends, bases de datos). Nosotros tenemos tres servicios en Railway:
1. **API**: el servidor Node.js en Docker
2. **PostgreSQL**: la base de datos
3. **Redis**: la caché

Los tres están en la misma red interna de Railway, así que se comunican directamente sin pasar por internet (más rápido y más seguro).

Cuando haces push a GitHub, Railway detecta el cambio, construye la imagen Docker y despliega automáticamente.

---

**GitHub** es donde vive el código fuente. Tiene dos usos:
1. Control de versiones: guarda el historial de todos los cambios
2. Trigger de despliegues: cuando haces push, Vercel y Railway se enteran y despliegan

---

## 16. Las variables de entorno — los secretos de la app

Las variables de entorno son configuraciones que viven **fuera del código**. No se guardan en GitHub porque son secretas o cambian entre entornos.

Por ejemplo, `JWT_SECRET` es la clave que firma los tokens de sesión. Si la pusieras en el código y alguien viera tu repositorio de GitHub, podría falsificar tokens y hacerse pasar por cualquier usuario.

**¿Cómo se usan?**

En el código se leen así:
```typescript
const secret = process.env.JWT_SECRET  // Lee la variable del entorno
```

En Railway, se definen en la sección "Variables" de cada servicio. Railway las inyecta en el contenedor Docker cuando arranca.

**Variables que necesita la API:**

| Variable | Para qué sirve |
|----------|----------------|
| `DATABASE_URL` | Dirección completa de la BD: `postgresql://usuario:contraseña@host:5432/nombre_bd` |
| `REDIS_URL` | Dirección de Redis: `redis://host:6379` |
| `JWT_SECRET` | Clave secreta para firmar tokens (mínimo 32 caracteres aleatorios) |
| `JWT_ACCESS_EXPIRES` | Cuánto dura el access token: `15m` = 15 minutos |
| `JWT_REFRESH_EXPIRES` | Cuánto dura el refresh token: `7d` = 7 días |
| `GOOGLE_CLIENT_ID` | ID público de la app en Google Cloud |
| `GOOGLE_CLIENT_SECRET` | Contraseña secreta de la app en Google Cloud |
| `GOOGLE_CALLBACK_URL` | URL donde Google redirige tras autenticar |
| `FRONTEND_URL` | URL del frontend (para el redirect post-OAuth) |
| `CORS_ORIGIN` | URL del frontend (para la seguridad CORS) |
| `NODE_ENV` | `production` (activa optimizaciones y seguridad adicional) |

**CORS** (Cross-Origin Resource Sharing) es un mecanismo de seguridad del navegador. Por defecto, un sitio en `vercel.app` no puede hacer peticiones a `railway.app` — el navegador las bloquea. La API debe decirle explícitamente "acepto peticiones de este dominio de Vercel". Por eso `CORS_ORIGIN` y `FRONTEND_URL` deben ser exactos, sin espacios al final.

---

## 17. Flujo completo — qué pasa cuando añades un gasto

Vamos a seguir paso a paso qué ocurre técnicamente cuando un usuario añade un gasto de 30€ en un viaje:

**En el navegador (frontend):**
1. El usuario rellena el formulario de "Nuevo gasto"
2. React Hook Form valida los campos (¿hay descripción? ¿el importe es un número positivo?)
3. Zod valida el formato completo del objeto según el schema de `@splitmate/shared`
4. Si todo es válido, React Query ejecuta la mutation: `POST /api/v1/groups/abc-123/expenses`
5. La petición sale del navegador con el token JWT en la cabecera: `Authorization: Bearer eyJ...`

**En la red:**
6. La petición llega a Vercel
7. Vercel ve que empieza por `/api/*` → la redirige a Railway
8. La petición llega al servidor de Railway

**En el servidor (backend):**
9. Express recibe la petición
10. El middleware `authenticate` lee el token JWT, lo verifica con `JWT_SECRET`, extrae el userId
11. El middleware `authorize` busca en la BD si ese userId pertenece al grupo `abc-123` (seguridad: evita que alguien de otro grupo añada gastos)
12. Zod valida el body de la petición de nuevo en el servidor (no nos fiamos solo del frontend)
13. `expenses.service` calcula cómo se divide el gasto: si es EQUAL entre 3 personas de 30€ → 10€ cada uno
14. `expenses.repository` hace dos operaciones en PostgreSQL dentro de una **transacción**:
    - Inserta el gasto en la tabla `expenses`
    - Inserta 3 filas en `expense_splits` (una por persona)
    - Si cualquiera falla, las dos operaciones se cancelan (atomicidad)
15. En background (sin bloquear la respuesta), comprueba si alguien superó el límite de deuda del grupo
16. La API responde: `{ data: { id: "xyz", amount: "30.00", ... } }`

**De vuelta en el navegador:**
17. React Query recibe la respuesta exitosa
18. `onSuccess` ejecuta `invalidateQueries(['expenses', 'abc-123'])` y `invalidateQueries(['balances', 'abc-123'])`
19. React Query vuelve a pedir la lista de gastos y los balances al servidor
20. Los componentes `ExpenseListTab` y `BalanceTab` se actualizan automáticamente
21. El nuevo gasto aparece en la lista sin que el usuario haya recargado la página

---

## Resumen de tecnologías

| Tecnología | Tipo | Para qué |
|------------|------|----------|
| Node.js | Runtime | Ejecutar JavaScript en el servidor |
| Express | Framework | Crear el servidor HTTP |
| TypeScript | Lenguaje | Tipado estático en todo el proyecto |
| PostgreSQL | Base de datos | Guardar todos los datos de forma persistente |
| Prisma | ORM | Hablar con PostgreSQL desde TypeScript |
| Redis | Caché | Guardar resultados frecuentes en memoria |
| JWT | Protocolo | Autenticación sin sesiones en servidor |
| Passport.js | Librería | Implementar OAuth de Google |
| React | Librería UI | Construir la interfaz de usuario |
| Vite | Bundler | Compilar y servir el frontend |
| React Query | Librería | Gestionar peticiones y caché del servidor |
| Zustand | Librería | Estado global del cliente |
| Tailwind CSS | Framework CSS | Estilos mediante clases utilitarias |
| shadcn/ui | Componentes | Botones, modales, inputs pre-diseñados |
| Docker | Contenedores | Empaquetar la API para producción |
| Vercel | Hosting | Servir el frontend globalmente |
| Railway | Hosting | Alojar la API, PostgreSQL y Redis |
| GitHub | Repositorio | Control de versiones y trigger de deploys |
| pnpm | Gestor paquetes | Instalar librerías de terceros |
| Turborepo | Build tool | Coordinar builds del monorepo |

---

*Documento en `docs/guia-tecnica.md` · Última actualización: 2026-04-09*
