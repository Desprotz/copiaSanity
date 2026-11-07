# Contrato HTTP propuesto — API propia v1

Estado: diseño; ningún endpoint está implementado. **79 combinaciones método/ruta** (revisión 2026-11-07: se quitan 3 rutas de inicio de sesión porque lo resuelve Cloudflare Access y se añaden 2 de compilación del sitio). Se sirven desde Cloudflare Workers con Hono; ver architecture.md. P = /api/v1/p/:project; D = /api/v1/p/:project/d/:dataset. Los IDs son nuestros; no se copian rutas privadas de Sanity. Los adaptadores GROQ/GraphQL no prometen sustitución directa de sus clientes.

## Reglas comunes

- Resolver identidad y proyecto; comprobar permiso en la capa de datos, incluidos workers, consultas, relaciones, caché, websockets e importaciones. Nunca confiar en org_id enviado por cliente.
- Publicación y todas las mutaciones con precondición/idempotencia donde se indica. If-Match representa la revisión/cabeza esperada; conflicto responde 409. Reintento con misma clave y distinto cuerpo responde 409.
- Paginación por cursor opaco ligado a orden estable y ámbito. Límites iniciales propuestos: 100 elementos por página, 1 MiB de documento y 100 operaciones por transacción; medidos y ajustados antes de producción.
- Identidad del editor: Cloudflare Access delante del editor y del API. El API **verifica la firma del JWT** de la cabecera Cf-Access-Jwt-Assertion (emisor, audiencia y caducidad) y nunca confía solo en una cabecera de correo. Cierre de sesión: URL de Access /cdn-cgi/access/logout. Tokens de servicio (compilación del sitio, copias) mediante Authorization; nunca en URL. Editor y API comparten origen, así que CORS solo hará falta en M5.
- 400 formato; 401 sin sesión; 403 sin operación permitida; 404 recurso inexistente o ajeno; 409 conflicto; 413 tamaño; 422 contenido inválido; 429 cuota; 503 dependencia. Errores con code, requestId y detalles no sensibles.
- GET públicos solo en datasets públicos y perspectiva publicada, con proyecciones permitidas. Un dataset público no expone borradores, historial, actividad, credenciales ni configuraciones. Las relaciones pasan por el mismo filtro.
- Escritura de schemas usa DSL cerrado: no acepta código JavaScript arbitrario ni entrega definiciones del usuario directamente al compilador de validación del servidor.
- SAML (M6) se configuraría como proveedor de identidad en Cloudflare Access; no se implementan endpoints de protocolo propios. F20/F21 y S22/S23 no tienen rutas en esta versión porque IA está aplazada.

| Método / ruta | Acción | Permiso | Entrada | Salida | Flujo | Etapa |
|---|---|---|---|---|---|---|
| GET /api/v1/me | Identidad y membresías | sesión | ninguno | usuario; proyectos permitidos | F01 | M1 |
| GET /api/v1/projects | Listar proyectos permitidos | sesión | cursor | página de proyectos | F01 F12 | M1 |
| POST /api/v1/projects | Crear proyecto | dueño de organización | nombre; slug | proyecto | F12 | M4 |
| GET P/datasets | Listar datasets | miembro | cursor | página | F12 | M1 |
| POST P/datasets | Crear dataset | administrador | nombre; visibilidad | dataset | F12 | M1 |
| GET D/schemas | Consultar modelos | editor o desarrollador | tipo; versión | definiciones | F02 | M1 |
| POST D/schemas | Registrar versión de modelo | desarrollador | DSL declarativo validado | schemaVersion; diagnóstico | F02 | M1 |
| POST D/schema-validations | Validar datos contra modelo | desarrollador | schemaVersion | jobId | F02 F13 | M2 |
| GET D/documents | Buscar documentos | lector autorizado | tipo; búsqueda; cursor; perspectiva | página; cursor | F03 F04 | M1 |
| POST D/documents | Crear borrador | editor | tipo; contenido; clave de idempotencia | documentId; revisionId; ETag | F04 | M1 |
| GET D/documents/:id | Leer una perspectiva | lector autorizado | perspectiva | contenido; ETag | F04 | M1 |
| PATCH D/documents/:id/draft | Guardar edición | editor | parche; If-Match; idempotencia | revisión; ETag o 409 | F04 | M1 |
| POST D/documents/:id/duplicate | Duplicar con nueva identidad | editor | nuevo externalId; idempotencia | borrador | F04 | M1 |
| POST D/documents/:id/publish | Publicar revisión exacta | editor con permiso publicar | revisionId; If-Match; idempotencia | revisión pública; generación | F04 | M1 |
| POST D/documents/:id/unpublish | Retirar publicación | publicador | If-Match; idempotencia | 204 | F04 | M1 |
| DELETE D/documents/:id | Crear tombstone | editor con permiso borrar | If-Match; idempotencia | 204 o 409 referencias | F04 | M1 |
| POST D/site-builds | Encolar compilación del sitio público | editor con permiso publicar | motivo; idempotencia | buildId; estado queued o coalesced | F04 | M1 |
| GET D/site-builds/:id | Ver estado de la compilación | editor | ninguno | estado; URL del despliegue; error redactado | F04 | M1 |
| GET D/documents/:id/references | Consultar referencias entrantes | lector autorizado | perspectiva; cursor | referencias visibles | F03 | M2 |
| GET D/documents/:id/history | Consultar revisiones | lector con historial | cursor | metadatos de revisiones | F05 | M2 |
| GET D/documents/:id/compare | Comparar dos revisiones | lector con historial | from; to | diferencias por campo | F05 | M2 |
| POST D/documents/:id/restore | Crear borrador desde revisión | editor | sourceRevision; If-Match; idempotencia | nueva revisión | F05 | M2 |
| GET D/documents/:id/comments | Leer hilos | miembro autorizado | cursor | hilos | F06 | M3 |
| POST D/documents/:id/comments | Añadir comentario | comentarista | texto; ruta de campo | comentario | F06 | M3 |
| PATCH D/comments/:id | Resolver hilo | autor o moderador | estado | comentario | F06 | M3 |
| GET D/tasks | Listar tareas | miembro autorizado | estado; responsable; cursor | página | F06 | M3 |
| POST D/tasks | Asignar tarea | editor | documento; responsable miembro; título | tarea | F06 | M3 |
| PATCH D/tasks/:id | Actualizar tarea | responsable o editor | estado; fecha | tarea | F06 | M3 |
| POST D/schedules | Programar revisión congelada | publicador | documentId; revisionId; instante; zona | scheduleId; releaseId | F07 | M2 |
| DELETE D/schedules/:id | Cancelar si sigue pendiente | publicador | versión esperada | 204 o 409 | F07 | M2 |
| GET D/releases | Listar lanzamientos | lector autorizado | cursor; estado | página | F08 | M3 |
| POST D/releases | Crear conjunto | publicador | nombre; entradas; idempotencia | releaseId | F08 | M3 |
| PATCH D/releases/:id | Cambiar conjunto no ejecutado | publicador | entradas; precondición | lanzamiento | F08 | M3 |
| POST D/releases/:id/validate | Validar conjunto | publicador | ninguno | errores por documento | F08 | M3 |
| POST D/releases/:id/publish | Publicar conjunto | publicador | instante opcional; precondición; idempotencia | estado o jobId | F08 | M3 |
| POST D/releases/:id/revert | Restaurar publicación anterior | publicador | precondiciones; idempotencia | resultado o 409 | F08 | M3 |
| POST D/query | Consulta estructurada propia | lector autorizado | filtro; proyección; orden; límite; perspectiva | resultado; generación | F09 | M1 |
| POST D/query/groq | Adaptador GROQ | lector autorizado | consulta; parámetros; perspectiva | resultado o error de capacidad | F09 | M5 |
| POST D/graphql | Adaptador GraphQL | lector autorizado | query; variables | data; errors | F09 | M5 |
| POST D/transactions | Mutaciones atómicas | editor | operaciones acotadas; precondiciones | revisiones o rollback | F09 | M5 |
| GET D/events | Suscripción SSE | lector autorizado | cursor opaco; perspectiva | eventos filtrados o resync | F09 | M5 |
| GET /api/v1/ws | Canal WebSocket | sesión o credencial efímera | salas autorizadas; época | updates y presencia | F06 | M5 |
| GET P/tokens | Listar metadatos de tokens | administrador | cursor | sin secretos ni hashes | F10 | M1 |
| POST P/tokens | Crear token restringido | administrador | rol; expiración | secreto una sola vez | F10 | M1 |
| DELETE P/tokens/:id | Revocar token | administrador | ninguno | 204 | F10 | M1 |
| PUT P/cors | Configurar orígenes | administrador | orígenes exactos; credenciales | configuración | F10 | M5 |
| GET P/memberships | Listar miembros | administrador | cursor | miembros y roles | F11 | M6 |
| PUT P/memberships/:user | Asignar rol | administrador | roleId | membresía; auditoría | F11 | M6 |
| DELETE P/memberships/:user | Retirar acceso | administrador | ninguno | 204; invalidación de acceso | F11 | M6 |
| POST P/roles | Definir rol | administrador | reglas del DSL | rol validado | F11 | M6 |
| GET P/activity | Ver auditoría | administrador | rango; cursor | eventos sin secretos | F12 | M2 |
| GET P/usage | Ver consumo | administrador | período UTC | métricas y estimación | F12 | M2 |
| PUT P/spending-alerts | Definir avisos | administrador | umbrales; moneda | configuración | F12 | M4 |
| POST D/exports | Exportar contenido autorizado | administrador | perspectivas; formato | jobId; descarga autorizada | F13 | M2 |
| POST D/imports | Importar en destino de prueba | administrador | archivo propio; estrategia; dryRun | jobId; conflictos | F13 | M2 |
| POST D/migrations | Aplicar transformación registrada | desarrollador | migración; dryRun; respaldo | jobId | F13 | M2 |
| POST P/backups | Crear copia consistente | administrador | datasets | jobId; manifiesto | F13 | M1 |
| POST P/restores | Recuperar en nuevo dataset | administrador | backupId; destino nuevo | jobId; verificación | F13 | M1 |
| POST P/assets/uploads | Reservar carga | editor | nombre; tipo; bytes | assetId; destino temporal | F14 | M1 |
| POST P/assets/:id/complete | Validar recurso cargado | editor propietario de carga | checksum | estado ready/rejected | F14 | M1 |
| GET P/assets/:id | Leer metadatos | lector autorizado | ninguno | metadatos | F14 | M1 |
| GET P/assets/:id/content | Descargar variante autorizada | lector o público permitido | preset permitido | bytes; caché según acceso | F14 | M1 |
| PATCH P/assets/:id | Cambiar metadatos | editor | campos permitidos | recurso | F14 | M2 |
| DELETE P/assets/:id | Retirar recurso no usado | editor | precondición | 204 o 409 | F14 | M2 |
| GET P/library | Consultar biblioteca autorizada | lector | carpeta; filtro; cursor | recursos | F15 | M4 |
| POST P/assets/:id/versions | Subir nueva versión | editor | carga validada | versión; sin cambiar referencias silenciosamente | F15 | M4 |
| POST D/preview-sessions | Abrir vista previa | editor | documento o release; expiración | sesión breve; URL local | F16 | M2 |
| POST P/webhooks | Registrar webhook | administrador | URL autorizada; filtro | endpoint; secreto una vez | F17 | M4 |
| GET P/jobs | Consultar trabajos | administrador | estado; cursor | página | F17 | M4 |
| GET P/jobs/:id | Ver progreso autorizado | administrador | ninguno | estado; resultado redactado | F13 F17 | M1 |
| POST P/jobs/:id/retry | Reintentar trabajo seguro | administrador | idempotencia | jobId | F17 | M4 |
| POST P/config-plans | Previsualizar configuración | desarrollador | configuración declarativa | plan; cambios; hash | F17 F18 | M4 |
| POST P/config-plans/:hash/apply | Aplicar plan verificado | administrador | hash; precondiciones; idempotencia | resultado | F17 F18 | M4 |
| GET D/sdk-schema | Contrato para SDK y tipos | desarrollador | versión | esquema público autorizado | F18 | M5 |
| POST D/writing-documents | Crear texto libre | editor | texto y plantilla manual | documento con revisión | F19 | M3 |
| POST D/writing-documents/:id/map | Mapear a campos manualmente | editor | mapeo explícito; revisión; idempotencia | borrador estructurado | F19 | M3 |
| GET /health/live | Comprobar proceso | sonda | ninguno | ok sin detalles sensibles | F22 | M1 |
| GET /health/ready | Comprobar dependencias | sonda interna | ninguno | ready/unavailable | F22 | M1 |
| POST P/demo/reset | Reiniciar solo proyecto demo | administrador | confirmación; idempotencia | jobId; conjunto ficticio | F23 | M1 |

## Automatización y trabajos

Las operaciones jobId comparten jobs y la consulta de progreso. Webhooks de salida llevan eventId estable, fecha y firma HMAC con secreto cifrado en reposo. El receptor debe deduplicar. No se promete entrega exactamente una vez. No hay webhooks entrantes públicos en la primera etapa.

| Trabajo | Dónde corre | Activación propuesta | Condición de seguridad/corrección |
|---|---|---|---|
| Publicación programada | Worker con Cron Trigger | cada 5 min; consulta primero una marca en KV y solo abre Neon si hay algo vencido | Bloquear registro y publicar revisión congelada; retraso máximo esperado ~5 min. |
| Eventos pendientes y compilación | Worker con Cron Trigger | mismo barrido de 5 min | Evento y cambio de contenido comparten commit. Varias publicaciones seguidas se agrupan en una sola compilación (límite de 500 al mes). |
| Entrega webhook (M4) | Worker con Cron Trigger | cola con backoff; máximo 8 intentos | Firma; timeout; destino protegido contra SSRF; estado dead inspeccionable. |
| Variantes de imagen | Navegador del editor | antes de subir | El Worker no procesa imágenes (10 ms de CPU). Verifica tipo, tamaño y checksum al completar la carga. |
| Copia de seguridad | GitHub Actions | semanal, domingo 03:00 America/Bogota, y manual | pg_dump de Neon y copia de R2 a Google Drive con rclone; manifiesto con checksums; retención propuesta 8 semanas. |
| Prueba de restauración | GitHub Actions | mensual y manual | Restaurar la última copia en una rama desechable de Neon y comparar conteos. |
| Importación/exportación/migración (M2) | GitHub Actions o editor por lotes | petición administrativa | Credencial de servicio limitada; validar permiso también al ejecutar. |
| Limpieza | Worker con Cron Trigger | diaria | Solo cargas expiradas y objetos no referenciados; nunca borrar revisiones sin política explícita. |

Los intervalos son objetivos de diseño, no garantías de Sanity ni del futuro producto. No hay correo propio: Access envía los códigos de acceso. Cloudflare Workers gratis permite 5 Cron Triggers por cuenta; este diseño usa 1.
