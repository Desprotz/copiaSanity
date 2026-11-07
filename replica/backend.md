# Backend (replica-backend)

Fecha: 2026-11-07. Estado: **funciona en local contra la base real de Neon**. Todavía no está desplegado en Cloudflare (eso es replica-deploy).

## Qué hay

| Pieza | Dónde | Estado |
|---|---|---|
| Base de datos | Neon Free, proyecto `copiasanity`, AWS us-east-1, rama `production` | Creada por el usuario; migración M1 aplicada |
| Migraciones | `apps/api/migrations/*.sql`, aplicadas con `npm run migrate` (registro en `public.schema_migrations`) | 001_m1_core: 8 tablas |
| API | `apps/api` — Hono en Cloudflare Workers (local con `wrangler dev`) | 20 rutas bajo `/api/v1` |
| Capa de datos del editor | `apps/editor/src/data/api-store.ts` (mismo contrato que `local-store.ts`) | Activa con `VITE_DATA_SOURCE=api` (`.env.development`) |
| Inicio de sesión | Cloudflare Access | **Pendiente (deploy).** En local, `DEV_AUTH=1` en `.dev.vars`; sin esa variable el API responde 401 a todo |
| Imágenes | Bytes en `cms.asset_blobs` (Postgres) | **Provisional**: pasarán a R2 al desplegar |
| Compilación del sitio | Foto en `cms.site_builds`, agrupada por `BUILD_BATCH_SECONDS` (6 s en local, 300 en producción) | Falta llamar al deploy hook de Pages |
| Pagos, correo, integraciones | — | No aplican (uso personal; Access envía los códigos) |

Cómo arrancar en local: `npm run dev:api` (API en :8787) y `npm run dev` (editor en :5173, con proxy de `/api`).

### Esquema M1 frente a `schema.sql`

Se aplicó una versión **recortada** del diseño de 31 tablas, pensada para un solo editor: `content_types`, `documents` (borrador y publicado separados, `rev` para control optimista), `revisions` (historial inmutable de crear/publicar/descartar/retirar/duplicar; el autoguardado no agrega filas), `assets` + `asset_blobs`, `site_state`, `site_builds`, `audit_events`. Organizaciones, datasets, roles, tokens, lanzamientos y colaboración llegan con sus etapas (M3–M6) como migraciones nuevas; `schema.sql` sigue siendo el diseño de referencia.

### Decisión técnica: postgres v3, no v4

`postgres@4` (recién publicado) cerraba la conexión al hacer la negociación TLS dentro de `workerd` en Windows; `postgres@3.4.9` (la versión que documenta Cloudflare) funciona. Se fijó v3. Diagnóstico: sockets de `workerd` y red hacia Neon (IPv4 e IPv6) comprobados por separado y correctos.

## Varios sitios (migración 002, 2026-11-07)

Cada web (propia o de un cliente) es un **sitio** con sus tipos, documentos, fotos, estado y compilaciones. Todas las tablas llevan `site_id` en la clave primaria y en las claves foráneas compuestas, así que la base impide enlazar un documento con un tipo de otro sitio. El API agrupa las rutas en `/api/v1/s/:sitio/...`, comprueba que el sitio existe y pasa su id a cada consulta; `GET/POST /api/v1/sites` lista y crea sitios. Probado: desde el portafolio, leer, publicar o crear documentos del portal devuelve 404. Dos sitios ficticios (`portal-prueba`, `portafolio-prueba`); «Restaurar datos de prueba» solo actúa sobre ellos.

Pendiente para clientes: quién puede entrar a qué sitio (membresías y roles, M6) y un proyecto de Pages por sitio al desplegar. Las compilaciones de Pages (≈500/mes) y los 50 usuarios de Access se comparten entre todos los sitios de la cuenta.

## Lista de seguridad

- [x] Secretos solo en variables de entorno: `DATABASE_URL` en `apps/api/.dev.vars`, excluido de git; `.dev.vars.example` sin valores.
- [x] Nada secreto en el paquete del navegador (el editor solo conoce `/api/v1`).
- [x] Validación en el servidor de cada entrada (zod): ids, tipos de contenido, datos de documento, tamaños; la regla de publicar (`validate`) se repite en el servidor.
- [x] Escrituras en transacción con `select … for update` y revisión esperada: un guardado viejo recibe 409, nunca pisa otro cambio.
- [x] Imágenes: tipo declarado + bytes reales comprobados (firma WebP/JPEG/PNG), máximo 5 MB tras optimizar, `nosniff`.
- [x] Sin datos personales en URLs ni registros (los registros llevan acción y id, no contenido).
- [x] `npm audit`: 0 vulnerabilidades (2026-11-07).
- [x] Falla cerrado: sin `DEV_AUTH` ni Access, todo devuelve 401.
- [ ] **Verificar el JWT de Cloudflare Access** (emisor, audiencia, caducidad) antes de exponer el API. Bloqueante para desplegar.
- [ ] Autorización probada con una segunda persona (llega con roles, M6; hoy hay un único editor).
- [ ] Límite de solicitudes (reglas de Cloudflare) en el API.
- [ ] Copia de seguridad semanal a Google Drive (GitHub Actions) y una restauración probada. Neon Free conserva poco historial: no cuenta como copia.
- [ ] Política de privacidad: no hay visitantes con cuenta; si el sitio público añade formularios, listar a Cloudflare y Neon como encargados.

## Antes de desplegar (replica-deploy)

1. Verificación del JWT de Access en el middleware y aplicación de Access con tu correo.
2. Hyperdrive hacia Neon (pool de conexiones): en local cada consulta abre una conexión nueva desde Colombia a Virginia y tarda ~1 s; Hyperdrive lo resuelve en producción.
3. R2 para imágenes y migración de `asset_blobs` → R2.
4. **Cron sin despertar Neon:** hoy el Cron Trigger consulta la base cada 5 min, lo que gastaría horas de cómputo del plan gratuito. Usar una marca en Workers KV y abrir Neon solo si hay compilación pendiente (architecture.md).
5. Deploy hook de Cloudflare Pages en `maybeBuild` y el generador estático `apps/site`.
6. Copias a Google Drive.
