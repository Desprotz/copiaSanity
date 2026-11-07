# Reconocimiento documental de Sanity — web

Uso: proyectos personales. Fecha: 2026-11-06 (America/Bogota). Estado: inventario inicial verificable; no reconstrucción completa ni prueba práctica del original.

**Decisión posterior del usuario:** aplazar IA. C075–C080, S22–S23 y F20–F21 se conservan como referencia futura, fuera del alcance activo. La arquitectura actual está en architecture.md. Escritura libre sigue activa como edición y mapeo manual; publicación programada y webhooks siguen incluidos.

## Alcance y evidencia

Se conserva el objetivo futuro de cubrir todas las funciones. Esta revisión identifica **81 capacidades agrupadas**, 25 superficies de trabajo y 23 flujos; no afirma haber agotado cada opción del producto. Las prioridades ordenan el trabajo propuesto, no eliminan funciones. Las aplicaciones de IA permanecen solo como referencia aplazada; las funciones empresariales continúan activas.

Solo se consultaron documentación pública, planes e índices oficiales. No se accedió a una cuenta, no se inspeccionaron bundles, código ni APIs privadas y no se descargaron activos. No se ha observado el comportamiento real de pantallas ni medido clics. Las rutas se describen por navegación, sin inventar URL internas. La revisión de términos de una cuenta queda pendiente si se solicita usarla; esta fase no usa cuenta alguna.

El archivo llms.txt no pudo abrirse por el tipo de contenido del navegador; se usaron páginas HTML e índices. Algunas fuentes son índices: prueban existencia de familias de funciones, no todos sus detalles. Cada prueba de aceptación es una propuesta nuestra; no una afirmación sobre garantías internas de Sanity.

## Fuentes

Los IDs Dxx enlazan las filas de features.csv. local significa decisión propia, no fuente externa. D27–D30 complementan las familias D04/D05/D09.

| ID | Fuente | Acceso |
|---|---|---|
| D01 | [Studio](https://www.sanity.io/docs/studio) | Pública; consulta 2026-11-06 |
| D02 | [Esquemas y formularios](https://www.sanity.io/docs/studio/schemas-and-forms) | Pública; consulta 2026-11-06 |
| D03 | [Referencias](https://www.sanity.io/docs/studio/reference-type) | Pública; consulta 2026-11-06 |
| D04 | [Content Lake](https://www.sanity.io/docs/content-lake) | Pública; consulta 2026-11-06 |
| D05 | [Autenticación y tokens](https://www.sanity.io/docs/content-lake/http-auth) | Pública; consulta 2026-11-06 |
| D06 | [Importación y operaciones de datos](https://www.sanity.io/docs/content-lake/importing-data) | Pública; consulta 2026-11-06 |
| D07 | [Imágenes](https://www.sanity.io/docs/apis-and-sdks/image-urls) | Pública; consulta 2026-11-06 |
| D08 | [Edición visual](https://www.sanity.io/docs/visual-editing) | Pública; consulta 2026-11-06 |
| D09 | [Comparación de versiones](https://www.sanity.io/docs/studio/compare-document-versions) | Pública; consulta 2026-11-06 |
| D10 | [Borradores programados](https://www.sanity.io/docs/studio/scheduled-drafts-user-guide) | Pública; consulta 2026-11-06 |
| D11 | [Lanzamientos](https://www.sanity.io/docs/studio/content-releases) | Pública; consulta 2026-11-06 |
| D12 | [Roles](https://www.sanity.io/docs/user-guides/roles) | Pública; consulta 2026-11-06 |
| D13 | [Administración](https://www.sanity.io/docs/platform-management) | Pública; consulta 2026-11-06 |
| D14 | [Alertas de gasto](https://www.sanity.io/docs/platform-management/spending-alerts) | Pública; consulta 2026-11-06 |
| D15 | [Biblioteca de medios](https://www.sanity.io/docs/media-library) | Pública; consulta 2026-11-06 |
| D16 | [Canvas](https://www.sanity.io/docs/canvas) | Pública; consulta 2026-11-06 |
| D17 | [Content Agent](https://www.sanity.io/docs/content-agent) | Pública; consulta 2026-11-06 |
| D18 | [Agent Actions](https://www.sanity.io/docs/agent-actions) | Pública; consulta 2026-11-06 |
| D19 | [Functions](https://www.sanity.io/docs/functions) | Pública; consulta 2026-11-06 |
| D20 | [Blueprints](https://www.sanity.io/docs/blueprints) | Pública; consulta 2026-11-06 |
| D21 | [App SDK](https://www.sanity.io/docs/app-sdk) | Pública; consulta 2026-11-06 |
| D22 | [Dashboard](https://www.sanity.io/docs/dashboard) | Pública; consulta 2026-11-06 |
| D23 | [Context y bases de conocimiento](https://www.sanity.io/docs/ai/sanity-context) | Pública; consulta 2026-11-06 |
| D24 | [Planes y disponibilidad](https://www.sanity.io/pricing) | Pública; consulta 2026-11-06 |
| D25 | [Cambios del producto](https://www.sanity.io/docs/changelog) | Pública; consulta 2026-11-06 |
| D26 | [Alojamiento del panel](https://www.sanity.io/docs/studio/deployment) | Pública; consulta 2026-11-06 |
| D27 | [Transacciones](https://www.sanity.io/docs/content-lake/transactions) | Pública; consulta 2026-11-06 |
| D28 | [CORS](https://www.sanity.io/docs/content-lake/cors) | Pública; consulta 2026-11-06 |
| D29 | [Historial](https://www.sanity.io/docs/user-guides/history-experience) | Pública; consulta 2026-11-06 |
| D30 | [Caché API](https://www.sanity.io/docs/content-lake/api-cdn) | Pública; consulta 2026-11-06 |

## Ciclo central

Definir un modelo → crear contenido → validar y previsualizar → publicar → consumir desde una web → corregir con historial. El panel editorial, la base/API y la web consumidora son piezas diferentes. La demo será un consumidor de nuestro CMS, no el CMS completo.

## Pantallas y superficies

Son 25 superficies lógicas para analizar; algunas son paneles, modales o CLI/API, no 25 páginas reales observadas. S15/S19/S20/S24 podrían resolverse mediante CLI; sus consolas son propuestas propias. S25 pertenece a la demo. El diseño definitivo corresponde a replica-design.

**Estados vistos en vivo: ninguno.** Estados descritos en documentación: borrador/publicado; comparación no disponible sin segunda versión (D09); programación bloqueada por referencias pendientes (D10); roles con distinto acceso (D12). El resto de estados se debe verificar, no se presenta como observado.

| ID | Superficie | Entrada | Finalidad | Componentes | Fuente |
|---|---|---|---|---|---|
| S01 | Acceso | Inicio de sesión | Sesión y entrada a proyecto | Formulario; estado de sesión | D05 |
| S02 | Proyectos y aplicaciones | Dashboard / selector | Elegir contexto de trabajo | Lista; buscador; tarjetas | D22 D13 |
| S03 | Explorador documental | Studio / estructura | Buscar documentos por tipo | Paneles; filtros; resultados | D01 |
| S04 | Editor documental | Seleccionar o crear documento | Modificar y publicar | Campos; validación; acciones | D02 |
| S05 | Selector de referencia | Campo de relación | Elegir o crear destino | Búsqueda; selector; creación | D03 |
| S06 | Comparación e historial | Acciones del documento | Examinar diferencias y versiones | Selector; paneles comparados | D09 D29 |
| S07 | Comentarios y tareas | Panel editorial | Colaborar y revisar | Hilos; asignación; estados | D24 |
| S08 | Programación | Acciones de borrador | Elegir instante de publicación | Calendario; zona; confirmación | D10 |
| S09 | Lanzamientos | Studio / releases | Coordinar varias versiones | Listado; detalle; estado; validación | D11 |
| S10 | Exploración de consultas | Herramienta o cliente API | Consultar datos | Consulta; parámetros; resultado JSON | D04 |
| S11 | Tokens y CORS | Configuración de proyecto | Controlar acceso de clientes | Tabla; creación; revocación | D05 D28 |
| S12 | Miembros y permisos | Configuración / miembros | Administrar acceso | Usuarios; roles; reglas | D12 |
| S13 | Datasets y actividad | Administración | Separar datos y examinar actividad | Lista; acciones; registro | D13 D04 |
| S14 | Consumo y alertas | Administración / consumo | Ver uso y avisos | Métricas; umbrales | D13 D14 |
| S15 | Importación y recuperación | CLI o API; panel propio propuesto | Mover y recuperar datos | Trabajo; progreso; informe | D06 D04 |
| S16 | Archivos de documento | Campo imagen o archivo | Subir y preparar recurso | Selector; progreso; recorte | D07 |
| S17 | Biblioteca central | Media Library | Gestionar medios compartidos | Carpetas; metadatos; versiones | D15 |
| S18 | Vista previa visual | Presentation | Editar con contexto de la web | Vista dividida; selección; arrastre | D08 |
| S19 | Automatizaciones | CLI/API; consola propia propuesta | Configurar funciones y eventos | Configuración; ejecución; registro | D19 D20 |
| S20 | Extensiones y desarrollo | Configuración de app / CLI | Gestionar SDK y herramientas | Configuración; compilación | D21 D01 |
| S21 | Escritura libre | Canvas | Redactar y pasar a contenido estructurado | Editor; plantilla; mapeo | D16 |
| S22 | Asistente y acciones IA | Content Agent / acciones de campo | Proponer cambios | Conversación; diferencias; aprobación | D17 D18 |
| S23 | Contexto y conocimiento | Context | Exponer consulta de contenido propio | Endpoints; índices; estado | D23 |
| S24 | Entornos y despliegue | CLI / hosting | Operar editor y consumidores | Configuración; diagnóstico | D26 D20 |
| S25 | Portal de prueba y guía | Aplicación propia propuesta | Validar funciones sobre contenido ficticio | Catálogo; detalle; artículos; ayuda | local |

Para cada superficie implementada se probarán vacío, carga, contenido, error, acceso denegado, textos largos, teclado y anchuras 390/1440 px. Son requisitos propios, no estados ya vistos en Sanity. Sesión caducada, trabajo pendiente y pérdida de conexión se incluyen donde correspondan.

## Flujos

Conteos de clics: **no medidos en ninguno de los 23 flujos**. D09 documenta abrir menú y seleccionar comparación; D10 describe menú, programación y confirmación. Esas instrucciones no equivalen a una medición completa. La columna de casos es nuestro futuro conjunto de pruebas.

| ID | Objetivo | Recorrido lógico propuesto | Casos a verificar |
|---|---|---|---|
| F01 | Abrir proyecto | S01 → S02 → S03 | Proyecto vacío; sesión caducada; proyecto no autorizado |
| F02 | Definir modelo | S20 → S04 | Esquema inválido; cambio incompatible; dato previo no válido |
| F03 | Relacionar documentos | S04 → S05 → S04 | Destino eliminado; referencia débil; acceso restringido |
| F04 | Editar y publicar | S03 → S04 → S25 | Validación; doble envío; borrador privado; retirada |
| F05 | Comparar y recuperar | S04 → S06 → S04 | Sin segunda versión; recuperación sobre edición reciente |
| F06 | Revisar en equipo | S04 ↔ S07 | Dos sesiones; reconexión; rol lector; tarea sin responsable |
| F07 | Programar documento | S04 → S08 | Zona horaria; referencia no publicada; cancelación; reloj |
| F08 | Publicar campaña | S09 → S04 → S18 → S09 | Validación; versiones solapadas; ejecución fallida; reversión |
| F09 | Consultar y recibir cambios | S10 → S25 | Sintaxis; paginación; referencia; caché; desconexión |
| F10 | Configurar clientes | S11 → S10 | Token revocado; secreto ausente; origen rechazado |
| F11 | Administrar permisos | S12 → S01 → S04 | Escalada; acceso entre proyectos; rol eliminado |
| F12 | Inspeccionar operación | S02 → S13 → S14 | Cuota; alerta repetida; período UTC; permisos |
| F13 | Mover y recuperar datos | S13 → S15 → S13 | ID repetido; archivo ausente; interrupción; recuperación |
| F14 | Gestionar imagen | S04 → S16 → S25 | Archivo grande; formato inválido; borrado referenciado |
| F15 | Compartir medios | S17 → S16 → S04 | Visibilidad; nueva versión; recurso utilizado por dos proyectos |
| F16 | Editar desde vista previa | S18 ↔ S04 → S25 | Token expirado; campo sin mapa; arrastre inválido |
| F17 | Automatizar contenido | S19 → S04 → S19 | Entrega duplicada; bucle; timeout; rollback de configuración |
| F18 | Extender editor | S20 → S04 | Extensión inválida; modelo incompatible; acceso |
| F19 | Escribir y estructurar | S21 → S04 | Campo sin correspondencia; texto no asignado; conflicto |
| F20 | Aplicar IA | S22 → S04 | Propuesta rechazada; salida inválida; permiso; presupuesto |
| F21 | Consultar conocimiento | S23 → S22 | Índice atrasado; fuente eliminada; pregunta sin evidencia |
| F22 | Desplegar entorno propio | S24 → S01 → S25 | Configuración incompleta; migración fallida; salud |
| F23 | Recorrer y reiniciar demo | S25 → S03 → S04 → S18 → S25 | Reinicio sin permiso; no tocar datos reales |

## Componentes reutilizables propuestos

| Componente | Variantes | Estados propios a implementar | Uso |
|---|---|---|---|
| Navegación y selector de contexto | proyecto / dataset / herramienta | seleccionado; sin acceso; vacío | S02 S03 S13 |
| Listado y buscador | documentos / recursos / miembros | carga; sin resultados; selección | S03 S05 S12 S17 |
| Formulario generado | escalar / objeto / lista / referencia | inválido; oculto; solo lectura; pendiente | S04 S05 |
| Editor por bloques | texto / enlaces / bloque propio | selección; foco; conflicto | S04 S21 |
| Acciones y confirmaciones | publicar / retirar / eliminar / restaurar | pendiente; éxito; fallo; cancelado | S04 S06 S09 |
| Selector de versiones y comparación | borrador / publicado / campaña | sin alternativa; diferencia; conflicto | S06 S09 |
| Selector temporal | fecha / hora / zona | inválido; vencido; programado | S08 S09 |
| Selector de recursos | carga / existente / versión | progreso; rechazado; referenciado | S16 S17 |
| Vista previa dividida | escritorio / móvil | sincronizando; no autorizado; selección | S18 |
| Indicador de presencia e hilo | usuario / comentario / tarea | conectado; desconectado; resuelto | S04 S07 |
| Consulta y registro | editor / resultados / evento | sintaxis inválida; vacío; error | S10 S19 |
| Propuesta IA | conversación / diferencias | pendiente; rechazada; validada | S22 |

Botones, diálogos, avisos, campos y menús usarán etiquetas, marca y estilos propios. No se han medido colores, tamaños ni geometrías del original.

## Modelo de datos inferido

Es un modelo conceptual nuestro, no el esquema interno de Sanity. Alta confianza indica que la entidad es pública; no confirma cómo se almacena internamente.

| Entidad | Campos conceptuales | Relación | Evidencia / confianza |
|---|---|---|---|
| Usuario | id; nombre; identidad | membresías | D05 D12 / alta |
| Organización | id; nombre | proyectos | D13 / alta |
| Proyecto | id; nombre; configuración | datasets y membresías | D13 / alta |
| Membresía | usuario; proyecto; roles | usuario ↔ proyecto | D12 / alta |
| Rol | id; reglas; recursos | membresías y autorización | D12 / alta |
| Dataset | id; proyecto; visibilidad | documentos | D04 / alta |
| Tipo de documento | nombre; campos; validación | esquema de editor | D02 / alta |
| Documento | id; tipo; revisión; contenido | dataset y referencias | D02 D04 / alta |
| Versión | documento; contenido; contexto | borrador/publicación/lanzamiento | D09 D11 / alta |
| Referencia | origen; campo; destino; fuerza | documento ↔ documento | D03 / alta |
| Recurso | id; ubicación; metadatos; versiones | campos y biblioteca | D07 D15 / alta |
| Lanzamiento | id; estado; fecha; versiones | conjunto de documentos | D11 / alta |
| Comentario | autor; destino; texto; estado | documento | D24 / media; detalles pendientes |
| Tarea | responsable; destino; estado | documento y usuario | D24 / media |
| Credencial | id; permisos; revocación | acceso API | D05 / alta; almacenamiento seguro propio |
| Automatización | evento; configuración; ejecución | proyecto y eventos | D19 D20 / media |
| Registro operativo | actor; acción; fecha; resultado | proyecto | D13 / media |
| Base de conocimiento | fuentes; estado; versión de índice | proyecto y documentos | D23 / alta |

Sesiones de presencia, entregas de webhook, tareas programadas y propuestas IA exigirán más entidades en arquitectura; no se ha supuesto que la lista anterior sea suficiente. D02 explica que el modelo de formulario no impone por sí mismo un esquema de base de datos; nuestra arquitectura debe decidir validación de escrituras API y migraciones explícitamente.

## Matriz y prioridades

features.csv contiene 89 filas: 81 capacidades C001–C081, 5 propuestas previas I01–I05 y 3 exclusiones E01–E03. Total de prioridades, incluidas exclusiones: 38 must, 39 should, 12 could. Hay 4 skip: las tres exclusiones y I04, fusionada con Dashboard para evitar doble conteo. Ninguna capacidad está implementada.

Original=yes significa presencia documentada a nivel de capacidad. No significa que el comportamiento haya sido probado. unknown se conserva para dos mejoras cuya diferencia exacta no está comprobada. No usar unknown como ausencia en un porcentaje de paridad. Los criterios de aceptación, fuentes, pantalla y flujo están en la misma fila. En futuras fases habrá que dividir las capacidades demasiado amplias en casos más precisos sin perder sus IDs.

Correcciones de la evaluación anterior: **Dashboard ya reúne editores y aplicaciones (D22)** y **las alertas de gasto ya existen (D14)**. Estas últimas avisan del excedente estimado, pero no detienen el consumo. I03 es una posible mejora de experiencia, no una función inventada como ausente. I04 queda conservada y fusionada.

Planes: las capacidades avanzadas pueden exigir planes de pago o complementos; por ejemplo, lanzamientos conjuntos y roles personalizados (D11 D12 D24). Para comparar realmente esas interfaces haría falta acceso autorizado apropiado. No se comprarán planes para esta investigación.

## Lo que no se reproduce

E01: código, logotipos, textos, imágenes, contenido de terceros e identidad de Sanity, por tu instrucción. E02: comunidad, clientes, acuerdos y mercado del proveedor. E03: sus garantías contractuales, soporte y certificaciones. Esto no excluye desarrollar controles técnicos propios. Las licencias, cuentas, claves y costes de servicios externos no se heredan.

No se ha eliminado ninguna función técnica solo por ser compleja. Cobrar suscripciones a clientes no es requisito de uso propio; la gestión del consumo sí permanece. Facturación comercial a terceros se considera decisión de producto pendiente, no se construye automáticamente.

## Tamaño y dependencias

**XL para el objetivo completo**: 25 superficies, 23 flujos y 18 entidades conceptuales iniciales. Es una clasificación de complejidad, no una promesa temporal. Los tres riesgos principales son sincronización/edición concurrente, semántica de consultas/versiones/permisos y operación fiable de medios/automatización/IA.

Orden recomendado de entregas, aún pendiente de aprobar en arquitectura:

1. Ciclo básico completo con esquema, documentos, archivos, borradores, permisos y web consumidora.
2. Historial, vista previa, portabilidad y recuperación verificada.
3. Colaboración, programación, lanzamientos y automatizaciones.
4. Extensibilidad, biblioteca central, APIs de consulta avanzadas y capacidades empresariales.
5. Escritura libre manual. Agentes, contexto, conocimiento y asistencia IA aplazados por decisión posterior del usuario.

El orden no reduce el horizonte. Sin un corpus de pruebas no sería honesto decir que una consulta parecida equivale a toda la semántica GROQ ni que dos pestañas abiertas demuestran colaboración fiable.

## Pendientes explícitos para cerrar el reconocimiento práctico

- Ver pantallas y estados reales con cuenta autorizada, o demostraciones públicas; medir clics y capturar referencias antes de buscar similitud visual. No hay capturas guardadas.
- Desglosar tipos de campo, referencias entre datasets/globales, singletons, herramientas CLI y extensiones. Se conocen por índices, pero sus variantes no están auditadas.
- Profundizar en contratos de GROQ/GraphQL, transacciones, consistencia, paginación, límites y errores; API MCP de escritura frente al Context de solo lectura.
- Precisar aislamiento, retención, recuperación, permisos por documento y SAML; no equiparar roles simples a seguridad empresarial.
- Verificar detalles y disponibilidad de video, bibliotecas, Canvas, funciones programadas y conocimiento; no asumir misma disponibilidad en todos los planes.
- Definir si la compatibilidad de API significa migrar datos o sustituir clientes existentes sin cambios. Son trabajos distintos; no se promete sustitución directa.
- Confirmar alojamiento y servicios permitidos al elegir arquitectura. No se ha elegido stack ni instalado dependencias.

La base documental permite planificar arquitectura provisional. Las lagunas siguen abiertas y no autorizan afirmar reconocimiento exhaustivo. Siguiente fase, con tu confirmación: replica-architect.
