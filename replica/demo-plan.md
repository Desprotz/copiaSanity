# Proyecto de prueba: portal ficticio de propiedades y artículos

Estado: diseño de pruebas, sin aplicación ni datos creados. Nombre descriptivo provisional; no marca definitiva. Fecha: 2026-11-06.

Alcance actualizado: IA aplazada. F20/F21 y sus pruebas se conservan únicamente como referencia futura. No instalar modelos, conectar proveedores ni simular esas capacidades para marcarlas completas. F19 sigue activo con redacción convencional y mapeo manual.

## Propósito

El portal mostrará contenido publicado desde nuestro CMS. El editor administrará ese contenido y las herramientas técnicas probarán capacidades que no se ven en una web. La columna acceptance de features.csv contiene una comprobación propuesta para cada capacidad, vinculada a un flujo Fxx de recon.md.

## Datos que crearemos en la fase de implementación

Todo será ficticio, con texto propio y recursos nuestros o expresamente autorizados. No se importará contenido de Sanity.

| Tipo | Cantidad inicial propuesta | Relación o caso |
|---|---|---|
| Propiedad | 12 | venta/alquiler; precio; ubicación ficticia; agente; galería; estado |
| Agente | 3 | varias propiedades por agente; nombres ficticios |
| Artículo | 6 | autor; categoría; texto enriquecido; referencias a propiedades |
| Categoría | 3 | una vacía para comprobar listas sin resultados |
| Página | 4 | inicio; catálogo; contacto ficticio; campaña con bloques |
| Configuración del sitio | 1 | navegación y metadatos; candidato para probar documento único |
| Campaña editorial | 2 | versiones de página y propiedades; programación solapada |
| Recursos propios | 15 | imágenes de distinta proporción y tamaño; archivo breve de video cuando proceda |
| Cuentas de prueba | 3 | administrador; editor; lector; no personas reales |
| Proyectos de prueba | 2 | comprobar aislamiento y acceso centralizado |
| Datasets | 2 por proyecto | desarrollo y prueba de recuperación; sin datos de producción |

Dos propiedades y dos artículos tendrán variantes español/inglés. Habrá contenido en borrador, publicado y programado. Los casos inválidos se mantendrán separados del conjunto válido. Estas cantidades no son requisitos del CMS ni datos que ya existan.

## Recorridos de demostración

| Escenario | Flujos | Resultado observable |
|---|---|---|
| Crear una propiedad | F01 F02 F03 F04 F14 | Nuevo documento válido y foto visibles tras publicar |
| Editar sin publicar | F04 F16 | Cambio en vista previa; público conserva versión anterior |
| Comparar y recuperar | F05 | Historial identifica cambios; recuperación no pierde edición silenciosamente |
| Dos editores | F06 | Cambios concurrentes preservados o conflicto explícito |
| Campaña de fin de semana | F07 F08 | Publicación en instante elegido; conjunto coherente; cancelación y reversión |
| Lectura desde web y cliente | F09 F10 | Consulta correcta; actualización; token revocado rechazado |
| Usuario sin permiso | F11 | Bloqueo tanto en interfaz como mediante API |
| Inspección de consumo | F12 | Métricas y aviso con datos simulados; sin cargos |
| Recuperación total | F13 | Dataset restaurado con documentos y archivos verificables |
| Medios en dos proyectos | F15 | Reutilización autorizada y aislamiento de recursos privados |
| Automatización de contenido | F17 | Función procesa evento sin duplicar resultado ante reintento |
| Extensión del editor | F18 | Campo propio funciona y no cambia el núcleo |
| Redactar y estructurar | F19 | Texto transferido a campos sin pérdida |
| Asistencia de IA — aplazada | F20 | Fuera del plan activo; se retomará solo con nueva autorización |
| Consulta de conocimiento — aplazada | F21 | Fuera del plan activo; se retomará solo con nueva autorización |
| Entorno independiente | F22 | Panel y portal operan sobre backend elegido; diagnóstico claro |
| Reinicio de demo | F23 | Confirmación y restauración de datos ficticios; nunca tocar datos reales |

## Reglas para aceptar resultados

- Las pruebas se ejecutarán contra nuestra implementación, nunca como carga contra Sanity.
- Una fila de features.csv pasa a yes solo con evidencia reproducible. Una pantalla simulada no acredita backend funcional.
- Para funciones de varios componentes, partial identifica exactamente qué falta. No sumar dos veces I04 y Dashboard.
- No se ejecutan pruebas ni se preparan simuladores de IA en el alcance actual.
- Video, SAML e integraciones externas requieren pruebas específicas antes de marcarlas completas.
- El corpus GROQ/GraphQL necesita ampliar casos y especificar compatibilidad. Una consulta exitosa no prueba paridad de lenguaje.
- Las mediciones de latencia, escala y disponibilidad se definirán en arquitectura. No se adoptan garantías numéricas no probadas.

No se han creado servicios, cuentas, dependencias, claves, modelos de IA ni entornos. Esta fase únicamente deja un plan de validación.
