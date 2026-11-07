# Entrega del proyecto: CMS de MSE

Documento para quien continúa el proyecto. **No contiene contraseñas ni claves**: cada sección dice dónde viven y cómo obtener acceso propio. No agregues secretos a este archivo ni a ningún archivo del repositorio.

Fecha: 2026-11-07. Repositorio: https://github.com/Desprotz/copiaSanity (rama `main`).

## Qué es

Un CMS propio inspirado en las funciones de Sanity (sin copiar su código, textos ni diseño), para administrar varias webs —propias y de clientes— desde un solo editor. Presupuesto: $0, todo en planes gratuitos.

```
Editor (React)  ─┐
                 ├─ Worker «mse-cms» (Hono) ── Hyperdrive ── Neon (PostgreSQL)
API /api/v1  ────┘        │
                          └─ al compilar escribe lo publicado en KV
                                          │
Webs públicas: Worker «tienda-ropa», Worker «vinos-sotara»  ← leen de KV, nunca de Neon
```

## Direcciones en producción

| Qué | URL |
|---|---|
| Editor del CMS | https://mse-cms.desprotz01.workers.dev |
| Tienda de prueba «Telar Norte» | https://tienda-ropa.desprotz01.workers.dev |
| Bodega de prueba «Viña Sotará» | https://vinos-sotara.desprotz01.workers.dev |

## Cuentas y servicios

| Servicio | Cuenta / recurso | Cómo darle acceso a otra persona |
|---|---|---|
| **GitHub** | Repositorio `Desprotz/copiaSanity` (privado o público según su configuración) | Settings → Collaborators → Add people |
| **Cloudflare** | Cuenta de desprotz01@gmail.com. Subdominio `desprotz01.workers.dev` | Manage account → Members → Invite (rol *Workers Admin* o el mínimo necesario) |
| ↳ Worker `mse-cms` | Editor + API + tarea programada cada 5 min | — |
| ↳ Worker `tienda-ropa`, `vinos-sotara` | Webs públicas | — |
| ↳ Hyperdrive `cms-neon` | id `8def0a1b64ec4b9195d7309eb7078d23` (guarda dentro la conexión a Neon) | — |
| ↳ KV `cms-flags` | id `bc1afd8d333341dd9a8a6a6106a9eb4b` (contenido publicado, fotos, marca de compilación) | — |
| **Neon** | Proyecto `copiasanity`, AWS us-east-1, rama `production`, base `neondb` | Neon → Organization → Members → Invite |
| **R2** | No activado (pide tarjeta). Las fotos se guardan en Neon (`cms.asset_blobs`) | — |
| **Zero Trust / Access** | No activado (pide tarjeta). El inicio de sesión es propio (ver abajo) | — |

Los ids de Cloudflare no son secretos: están en `apps/*/wrangler.jsonc`.

## Usuarios del CMS

- Usuario dueño actual: **`admin`** (ve y administra todos los sitios). Su contraseña la conoce solo el dueño; en la base se guarda como hash bcrypt.
- **No compartan una misma cuenta.** Para crear un usuario propio:

```bash
npm run user
```

  Pide usuario, nombre y contraseña (mínimo 10 caracteres; no se muestra al escribir). Si el usuario ya existe, cambia su contraseña y cierra sus sesiones. Con `npm run user -w apps/api -- --cliente` se crea un usuario sin sitios asignados (los permisos por sitio están en la tabla `cms.site_members`; todavía no hay pantalla para asignarlos).
- Seguridad del inicio de sesión: cookie `HttpOnly; Secure; SameSite=Strict` de 14 días, cabecera anti-CSRF `x-cms: 1`, bloqueo tras 5 intentos fallidos en 15 min.

## Secretos: dónde están y cómo pasarlos

| Secreto | Dónde vive | Notas |
|---|---|---|
| Cadena de conexión de Neon (`DATABASE_URL`) | `apps/api/.dev.vars` en el PC del dueño (excluido de git) | Para trabajar en local. Obtenerla en Neon → Connect, **sin** connection pooling. Plantilla: `apps/api/.dev.vars.example` |
| La misma cadena para simular Hyperdrive en local | `apps/api/.env` (excluido de git) | Variable `CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE` |
| Conexión de producción | Dentro de Hyperdrive `cms-neon` en Cloudflare | No hay que copiarla a ningún archivo |
| Sesión de Wrangler | Perfil del usuario de Windows de quien hizo `npx wrangler login` | Cada persona hace su propio login con su cuenta invitada |
| Contraseñas del CMS | Solo como hash bcrypt en `cms.users` | Irrecuperables; se cambian con `npm run user` |

**Recomendación al entregar:** que la persona nueva entre con su propia invitación a Neon y Cloudflare. Si se envía la cadena de Neon por otro medio, usar un canal privado (gestor de contraseñas), nunca correo ni chat, y después **rotar la contraseña** en Neon (Roles → Reset password) y actualizar Hyperdrive:

```bash
npx wrangler hyperdrive update 8def0a1b64ec4b9195d7309eb7078d23 --connection-string="<nueva cadena>"
```

## Estructura del repositorio

| Carpeta | Contenido |
|---|---|
| `apps/editor` | Editor (React 19, Vite, React Router, React Aria, Tiptap). Diseño «Mapa de metro» |
| `apps/api` | Worker `mse-cms`: API Hono, autenticación, compilación y exportación a KV. `migrations/` (001–005), `scripts/` (migrar, crear usuario, sembrar sitios de prueba) |
| `apps/store` | Worker de la tienda de ropa |
| `apps/wine` | Worker de la bodega (botellas dibujadas en SVG a partir de los datos) |
| `replica/` | Documentación del método Replica: recon, arquitectura, matriz de funciones, backend, bitácora, diseño |
| `PRODUCT.md`, `DESIGN.md` | Contexto del producto y sistema de diseño |

## Trabajar en local

Requisitos: Node 24, npm, git. Luego:

```bash
npm install
```

```bash
npm run migrate
```

```bash
npm run dev:api
```

```bash
npm run dev
```

Editor en http://localhost:5173 (las llamadas a `/api` van al Worker local en el puerto 8787).

**Cuidado:** el API local usa **la misma base de Neon que producción**. Si el editor local compila un sitio, la exportación va al KV local y no al de producción. Para probar sin tocar datos reales: `npm run dev:lento -w apps/editor` (datos solo en el navegador, con 1,1 s de demora simulada).

## Publicar cambios

```bash
npm run build
```

```bash
npx wrangler deploy --config apps/api/wrangler.jsonc
```

```bash
npx wrangler deploy --config apps/store/wrangler.jsonc
```

```bash
npx wrangler deploy --config apps/wine/wrangler.jsonc
```

Cambios de base de datos: nueva migración numerada en `apps/api/migrations/` y `npm run migrate`. Las migraciones aplicadas se registran en `public.schema_migrations`.

## Cómo se conecta una web al CMS

1. Crear el sitio en el editor (selector de sitio → Nuevo sitio) y sus tipos de contenido.
2. Guardar su dirección pública en `cms.sites.public_url` (todavía no hay pantalla para editarla).
3. Crear un Worker como `apps/store` con `SITE_ID` del sitio y el mismo KV. Lee `pub:<sitio>:snapshot` y `pub:<sitio>:img:<id>`.
4. Al publicar en el editor, la compilación agrupada (60 s) escribe el contenido en KV; la tarea programada revisa cada 5 min y la baliza del editor permite forzarla.

Los nombres de campo que usa el código de la web deben coincidir con los del tipo de contenido.

## Límites gratuitos que hay que vigilar

Workers: 100.000 solicitudes/día y 10 ms de CPU por solicitud (por eso bcrypt se calcula en Postgres). KV: 1.000 escrituras/día. Neon: 1 GB y 100 horas de cómputo al mes. Las webs públicas comparten las solicitudes de Workers.

## Pendiente

- Copias de seguridad semanales a Google Drive (no hay copia fuera de Neon todavía).
- Pantalla de ajustes del sitio (dirección pública, miembros y roles por sitio).
- Fotos en R2 cuando se active; varias variantes por imagen.
- Historial y comparación de versiones (M2), lanzamientos (M3) y demás etapas en `replica/architecture.md` y `replica/features.csv`.
- Detalle completo del backend y la lista de seguridad en `replica/backend.md`; bitácora en `replica/build-log.md`.
