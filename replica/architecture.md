# Arquitectura propuesta — CMS personal sin IA, en servicios gratuitos

Fecha: 2026-11-07 (revisa la versión del 2026-11-06). Fase: diseño de arquitectura. No se instaló software, no se ejecutó el SQL y no se creó ninguna cuenta, base de datos ni aplicación.

## Qué cambió y por qué

La versión anterior suponía un servidor propio siempre encendido (API Fastify, worker, Keycloak, contenedores). Las condiciones reales son otras:

- Presupuesto inicial **$0**; no hay servidor contratado.
- El editor debe poder usarse **desde fuera de casa**.
- No se quiere depender del PC empresarial ni de dejar encendido el PC personal (Windows 10).
- La web pública debe seguir visible aunque todo lo demás esté apagado.

Decisión: **todo en servicios gratuitos** (Cloudflare + Neon), con Google Drive (plan Google AI Pro, 5 TB) para copias de seguridad y originales. El PC personal queda como plan B (ver al final).

## Decisión de alcance

Sin cambios: se aplazan C075–C080, F20–F21 y S22–S23 (IA). C073/C074 siguen como escritura y mapeo manual. La matriz conserva 89 filas: **79 activas**, 6 aplazadas por IA, 1 duplicada y 3 exclusiones.

Lo que cambia es el **orden**: las 79 activas se reasignaron a M1–M6 para que M1 sea un CMS personal que ya publica una web real. Funciones pensadas para equipos grandes (roles por recurso, SAML, varias organizaciones, colaboración en tiempo real, GROQ/GraphQL) pasan a etapas posteriores. Siguen siendo objetivo; no se descartan. features.csv y api.md ya reflejan las nuevas etapas.

## Piezas y servicios

| Pieza | Servicio | Límite gratuito consultado (2026-11-07) | Cómo lo respetamos |
|---|---|---|---|
| Web pública | Cloudflare Pages (proyecto `sitio`) | Archivos estáticos ilimitados; 500 compilaciones/mes; 20.000 archivos; 25 MiB por archivo | Sitio 100 % estático. Varias publicaciones seguidas se agrupan en una compilación. |
| Editor + API | Un solo Cloudflare Worker (`cms`) con archivos estáticos + Hono | Archivos estáticos sin coste por solicitud; 100.000 solicitudes/día al código; 10 ms de CPU por solicitud (la espera de red no cuenta) | Editor React y API comparten origen (sin CORS y una sola aplicación en Access). Lógica fina; operaciones pesadas en funciones SQL; sin procesar imágenes en el Worker. El mismo Worker lleva el Cron Trigger. |
| Conexión a la base | Cloudflare Hyperdrive | 100.000 consultas/día en plan gratuito | Pool de conexiones hacia Neon; credenciales solo aquí. |
| Base de datos | Neon Free (PostgreSQL) | 1 GB por proyecto; 100 CU-hora/mes; se suspende sin uso y despierta sola | Nada consulta la base si no hay actividad (ver «Programación»). |
| Imágenes publicadas | Cloudflare R2 | 10 GB-mes; 1 M operaciones clase A y 10 M clase B al mes; salida gratis | Solo variantes optimizadas (~200–400 KB). |
| Inicio de sesión | Cloudflare Access (Zero Trust Free) | Hasta 50 usuarios; código de un solo uso al correo | Política: solo tu correo. No programamos contraseñas. |
| Tareas programadas | Workers Cron Triggers | 5 por cuenta | Usamos 1 (barrido cada 5 min). |
| Copias de seguridad | GitHub Actions + rclone → Google Drive | Repositorio privado con minutos gratuitos mensuales; Drive con 5 TB | Copia semanal de base e imágenes; prueba de restauración mensual. |
| Originales y video | Google Drive; YouTube «no listado» para mostrar video | — | Drive archiva; la web nunca enlaza a Drive. |

Fuentes: [Workers: precios](https://developers.cloudflare.com/workers/platform/pricing/index.md), [Workers: límites](https://developers.cloudflare.com/workers/platform/limits), [Hyperdrive: precios](https://developers.cloudflare.com/hyperdrive/platform/pricing), [Neon: plan gratuito](https://neon.com/faqs/free-plan-limits-and-quotas), [R2: precios](https://developers.cloudflare.com/r2/pricing), [Cloudflare Access](https://www.cloudflare.com/en-gb/products/zero-trust/access). Los planes gratuitos pueden cambiar; revisarlos al crear cada cuenta.

### Qué se descarta de la versión anterior

| Antes | Ahora | Motivo |
|---|---|---|
| Fastify en proceso persistente | Hono en Workers | Workers no mantiene procesos; Hono corre igual en Workers y en Node (plan B). |
| Keycloak / OIDC propio | Cloudflare Access | Gratis, sin servidor que operar. |
| Worker de jobs siempre activo | Cron Trigger cada 5 min + GitHub Actions para tareas largas | No hay proceso permanente. |
| SSE y WebSocket (M1/M3) | Pasan a M5; evaluar Durable Objects entonces | No son necesarios para un solo editor. |
| Contenedores / Docker | Ninguno | No hay servidor. |
| Procesado de imágenes en servidor | Variantes generadas en el navegador | 10 ms de CPU no alcanzan. |
| Supabase | Neon | Supabase Free pausa el proyecto tras 7 días sin uso y hay que reactivarlo a mano; Neon despierta solo y da 1 GB. Ambos son PostgreSQL. |

### Qué del plan Google AI Pro se usa

- **Drive (5 TB):** copias de seguridad y fotos/videos originales.
- **US$10/mes de Google Cloud (Google Developer Program):** reservado para cuando se reactive la IA (Gemini vía Vertex AI o AI Studio). No se usa para infraestructura: exige tarjeta en la cuenta de facturación y el exceso se cobraría.
- **NotebookLM:** opcional, para consultar los documentos del proyecto en lenguaje natural.
- Si el plan se cancela, Drive baja a 15 GB. Por eso Drive solo guarda copias; nada de la web depende de él.

## Organización

~~~text
apps/editor        panel de contenido (React + TypeScript + Vite), servido como estáticos del Worker «cms»
apps/api           Hono en el Worker «cms»: HTTP + Cron Trigger
apps/site          generador del sitio estático (Astro, a confirmar al instalar) → Pages «sitio»
packages/domain    permisos, revisiones, publicación, referencias (TypeScript)
packages/contracts DSL de modelos, esquemas HTTP y tipos compartidos
packages/ui        componentes y tokens propios
migrations/        SQL revisado por etapa, incluidas funciones de publicación
ops/               workflows de GitHub Actions: copia, restauración, despliegues
~~~

Esta estructura aún no se ha creado. Un solo repositorio privado en GitHub.

~~~mermaid
flowchart LR
  Tu[Tú, desde cualquier lugar] --> Access[Cloudflare Access]
  Access --> Editor[Editor - estáticos del Worker cms]
  Access --> API[API Hono - Worker cms]
  Editor --> API
  API --> HD[Hyperdrive] --> Neon[(Neon PostgreSQL)]
  API --> R2[(R2 imágenes)]
  Cron[Cron cada 5 min] --> API
  API -->|deploy hook| Build[Compilación Pages]
  Build -->|lee publicado con token de servicio| API
  Build --> Sitio[Sitio público estático]
  Visitante --> Sitio
  GHA[GitHub Actions semanal] --> Neon
  GHA --> R2
  GHA --> Drive[(Google Drive)]
~~~

## Flujos principales

**Editar.** Entras al editor; Access pide el código enviado a tu correo. El editor llama al API en el mismo dominio. El API verifica la firma del JWT de Access (emisor, audiencia, caducidad), resuelve tu usuario y aplica permisos.

**Subir una imagen.** El navegador genera las variantes (por ejemplo 400, 800 y 1600 px en WebP) y pide al API una URL de carga firmada de R2. Sube directo a R2 y luego confirma; el API verifica tipo, tamaño y checksum antes de marcar el recurso como listo. El original en alta resolución puede guardarse en Drive aparte.

**Publicar.** El API llama a una función SQL que hace en una transacción: bloquear cabeza, validar, cambiar la revisión publicada, actualizar referencias, incrementar generación y registrar evento. Después registra una compilación pendiente. El barrido (o el botón «Publicar ahora») llama al *deploy hook* de Pages. La compilación pide al API todo lo publicado con un token de solo lectura, copia las imágenes necesarias desde R2 al resultado y genera HTML estático.

**Ver la web.** El visitante solo toca archivos estáticos de Pages. No llega al API, a Neon ni a R2. Si Neon está suspendido o el API caído, la web sigue igual.

### Dónde se sirven las imágenes públicas

Mientras no haya dominio propio, las variantes publicadas se copian dentro del sitio estático (tráfico ilimitado, máximo 20.000 archivos). Con 3 variantes por imagen caben unas 6.000 imágenes publicadas. R2 se usa como almacén de trabajo del editor. Si se compra un dominio (opcional, unos US$10/año), R2 puede servir las imágenes directamente con dominio propio y el límite de archivos deja de importar. No se usa el subdominio r2.dev en producción porque Cloudflare lo limita.

### Programación sin gastar la base

El Cron Trigger se ejecuta cada 5 minutos. Primero lee en Workers KV la hora de la próxima tarea vencida; solo si toca algo abre conexión a Neon. Así Neon puede seguir suspendido días enteros y no se consumen horas de cómputo. Retraso máximo esperado: unos 5 minutos. Nada de esto requiere un PC encendido.

## Datos y SQL

[schema.sql](schema.sql) mantiene 31 tablas y 48 claves foráneas. Cambios de uso:

- **Identidad:** `users.issuer` = equipo de Access; `users.subject` = claim `sub`. `sessions` no se usa en M1.
- **Colaboración:** `collab_snapshots` y `collab_updates` pasan a M5.
- **Funciones SQL de dominio:** publicar, despublicar, restaurar y publicar lanzamientos se implementarán como funciones PL/pgSQL en `migrations/`. Así cada operación es una sola llamada desde el Worker, la transacción no depende de varias idas y vueltas, y se respeta el límite de CPU.
- **Espacio:** las revisiones guardan instantáneas completas. Para un portal personal, 1 GB da margen amplio; M2 añade un indicador de uso de cuotas (I03) que avisa al 70 %.

### Invariantes de contenido (se conservan)

1. documents tiene identidad estable; revisions guarda instantáneas; heads apunta a borrador, publicado o versión de lanzamiento. Editar no sobrescribe lo publicado.
2. Una escritura bloquea documento/cabeza, comprueba permisos y revisión esperada, inserta revisión, actualiza referencias y cabeza, incrementa generación y agrega evento en **una transacción**.
3. La definición de esquema pertenece al mismo dataset; el servicio comprueba type_name, versión y datos.
4. Un borrador puede tener errores señalados; publicar aplica validación estricta. No se confía en la validación del navegador.
5. Referencias fuertes protegen el destino; las débiles admiten destino sin resolver.
6. Los recursos pertenecen al proyecto; un archivo subido no queda publicado por terminar la carga.
7. Contenido privado nunca comparte caché con el público.

### Permisos

Autorización central en el API, denegar por defecto. **El navegador nunca habla con PostgreSQL**; solo el Worker (vía Hyperdrive) y GitHub Actions tienen credenciales, guardadas como secretos. Por eso no hace falta RLS.

- M1: un administrador (tú). La política de Access solo admite tu correo, y el API además exige que el usuario exista y esté activo. Dos capas: si Access falla o se configura mal, el API sigue negando.
- Token de servicio de solo lectura para la compilación del sitio; solo ve contenido publicado.
- M6: roles por recurso y SAML (como proveedor dentro de Access).
- El usuario de base de datos del API no es dueño de las tablas; las migraciones usan otro usuario.

### Publicación, programación e historial

Se conservan las reglas de la versión anterior: un lanzamiento congela revisiones y valida referencias contra el estado resultante; la programación guarda instante UTC y zona IANA y revalida al ejecutar; revertir crea un cambio nuevo y nunca borra historia; M1 usa control optimista con ETag (un choque se ve, nunca se pisa en silencio).

## Copias de seguridad y recuperación

Imprescindibles antes de cargar contenido real, por eso están en M1.

- **Semanal (GitHub Actions):** `pg_dump` de Neon + sincronización de R2 → carpeta de Google Drive con rclone. Manifiesto con checksums. Retención propuesta: 8 semanas.
- **Mensual:** restaurar la última copia en una rama desechable de Neon y comparar conteos. Una copia que nunca se ha restaurado no cuenta.
- **Secretos:** credenciales de Neon, R2 y el token de rclone para Drive solo como secretos del repositorio.
- **Manual:** botón en el editor (M1) que lanza el mismo workflow.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Un plan gratuito cambia o se reduce | Todo es PostgreSQL estándar y Hono también corre en Node: se puede mudar a otro proveedor o al PC personal sin reescribir el CMS. Copias semanales en Drive. |
| 10 ms de CPU por solicitud | Lógica pesada en SQL; imágenes en el navegador; medir en M1 con contenido de prueba. |
| 500 compilaciones/mes | Agrupar publicaciones; compilación como máximo cada 5 min salvo «Publicar ahora». |
| Horas de cómputo de Neon | Sin consultas periódicas a la base; el cron consulta KV primero. |
| Pérdida de acceso al correo | Access depende de recibir el código; mantener el correo con verificación en dos pasos. |
| Configuración errónea de Access | El API verifica el JWT y la lista de usuarios por su cuenta. |
| Dependencia de Cloudflare | Exportación completa desde M2; plan B documentado. |

## Etapas de implementación

Cada etapa termina con pruebas de sus criterios. Las etapas siguientes no se marcan como hechas por adelantado.

### M1 — Núcleo publicable

- Capacidades: C001 C002 C003 C004 C006 C007 C009 C010 C011 C012 C013 C014 C029 C032 C033 C038 C044 C050 C051 C052 C054 C081 I01 I02.
- Infraestructura: cuentas de Cloudflare, Neon y GitHub; Access con tu correo; Hyperdrive; R2; Worker «cms» (editor + API + Cron Trigger); proyecto de Pages «sitio»; workflow de copia a Drive.
- Salida exigida: definir modelos, crear y editar contenido, subir imágenes con variantes, publicar y ver el cambio en la web pública; acceder desde fuera de casa; copia en Drive restaurada al menos una vez.

### M2 — Historial, programación y vista previa

- Capacidades: C005 C008 C017 C018 C019 C023 C024 C045 C048 C049 C053 C060 I03.
- Salida exigida: comparar y recuperar sin pisar cambios; programar una publicación con el PC apagado; exportar/importar; vista previa de borradores sin filtrarlos al público; indicador de consumo de cuotas gratuitas.

### M3 — Lanzamientos, edición visual y escritura

- Capacidades: C021 C022 C025 C026 C027 C028 C061 C062 C063 C073 C074.
- Salida exigida: campaña de varios documentos publicada de forma consistente y revertible; escritura libre mapeada a campos sin IA.

### M4 — Medios, automatizaciones y varios proyectos

- Capacidades: C043 C046 C047 C055 C056 C057 C058 C059 C064 C065 C066 C067 C068 C072.
- Salida exigida: biblioteca de medios organizada; video vía YouTube no listado; webhooks firmados sin duplicar efectos; varios proyectos desde un panel.

### M5 — Consultas, tiempo real y extensiones

- Capacidades: C015 C016 C020 C030 C031 C034 C035 C036 C037 C039 C069 C070 C071 I05.
- Salida exigida: corpus de consultas; errores explícitos ante sintaxis no soportada; edición simultánea (evaluar Durable Objects y sus límites gratuitos); SDK propio.

### M6 — Multiusuario y permisos avanzados

- Capacidades: C040 C041 C042.
- Salida exigida: invitar a otras personas con roles; reglas por recurso; SAML probado en Access; revisión final de todas las funciones activas.

Rutas por etapa: ver la columna «Etapa» de [api.md](api.md) (79 rutas).

## Plan B: PC personal como servidor

Si los planes gratuitos dejan de servir, el mismo código corre en el PC personal: Hono sobre Node, PostgreSQL local restaurado desde la copia de Drive, y Tailscale para editar desde fuera. Condiciones: Windows 10 inscrito en las actualizaciones de seguridad extendidas (gratuitas hasta el 12 de octubre de 2027; [fuente](https://www.helpnetsecurity.com/2026/06/26/microsoft-windows-10-free-security-updates-esu-program/)), sin suspensión, arranque automático de servicios y copia fuera del equipo. La web pública seguiría en Cloudflare Pages.

## Validación de esta fase y siguiente paso

Se comprobó que las 79 filas activas tienen etapa (M1 24, M2 13, M3 11, M4 14, M5 14, M6 3) y que api.md tiene 79 rutas con etapa. No se ejecutó el SQL ni se probó ningún servicio; los límites de CPU y de compilaciones deben medirse en M1 con datos de prueba.

Siguiente fase: replica-design (interfaz y componentes del alcance M1), o bien crear las cuentas y un prototipo mínimo para medir los límites antes de diseñar. Nada se instala ni se crea sin tu confirmación.
