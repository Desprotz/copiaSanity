# Evaluación de viabilidad: alternativa personal a Sanity

Fecha: 2026-11-06. Recomendación provisional basada en 17 aportaciones de 4 plataformas. Leer primero las limitaciones de `README.md`.

Actualización posterior de replica-recon: [Dashboard](https://www.sanity.io/docs/dashboard) ya centraliza editores y aplicaciones. Las [alertas de gasto](https://www.sanity.io/docs/platform-management/spending-alerts) avisan del excedente estimado y no bloquean consumo. Las propuestas siguientes se conservan como historial de investigación; no deben interpretarse como ausencia de esas capacidades en Sanity. La matriz actual fusiona la navegación propuesta con Dashboard.

## Decisión recomendada

Sí merece la pena explorar un CMS propio si la finalidad es aprender, controlar datos e infraestructura y ajustar la experiencia a tus proyectos. Las reseñas no justifican reconstruir toda la plataforma únicamente para ahorrar una suscripción. El mantenimiento, las copias de seguridad, los conflictos de edición, las actualizaciones y el alojamiento pasan a ser responsabilidad nuestra.

Tu objetivo de todas las funciones se conserva como horizonte. No equivale a un compromiso de paridad completa: todavía no existe inventario, arquitectura ni estimación. La próxima fase debe convertirlo en capacidades verificables, señalar lo desconocido y ordenar entregas. Mi valoración técnica es que la paridad total constituye un programa grande, no una primera versión pequeña; no asigno fechas sin esa fase.

## Quejas observadas

Orden manual por utilidad para este proyecto, no por prevalencia poblacional. Los IDs remiten a `reviews.csv`.

| Tema | Aportes / plataformas | Evidencia | Lectura |
|---|---|---|---|
| Aprendizaje y configuración | 7 / 4 | G02 G03 G04 C01 C03 T01 R05 | Señal transversal de esta muestra; mezcla usuarios técnicos y no técnicos y bastante evidencia antigua. |
| Comprensión del coste | 2 / 2 | G07 R02 | Evidencia débil. R02 terminó con reembolso; no demuestra mala facturación sistemática. |
| Navegación entre proyectos | 1 / 1 | R06 | Evidencia débil y autor interesado en promover su herramienta. |
| Ejemplos desactualizados | 1 / 1 | G01 | Evidencia histórica débil; comprobar cada necesidad actual. |
| Subida de imágenes | 1 / 1 | G05 | Incidente no reproducido; no hay versión ni causa. |

La tabla utiliza una categoría principal por contexto para los extractos. Por ejemplo, G04 también menciona documentación y G07 aprendizaje; no se añadieron a esos recuentos. Por tanto, son recuentos conservadores de clasificación, no todas las menciones existentes.

## Funciones solicitadas o carencias

1. **Backend bajo control del usuario:** R01 y R03, 2 aportes, solo Reddit. Evidencia débil, pero pertinente al uso propio. El primer autor promociona una alternativa propia.
2. **Experiencia de GraphQL más cercana a la de GROQ:** G06, 1 aporte en G2. Evidencia débil. GraphQL ya existe; no presentarlo como función ausente.
3. **Funciones no especificadas pendientes:** C02, 1 reseña de 2021. No se convierte en requisito: no identifica una necesidad comprobable hoy.

## Necesidades desatendidas: hipótesis

1. Desarrollador que quiere controlar el backend sin depender del proveedor: R01 y R03, 2 aportes / 1 plataforma. Encaje a validar contigo; usar el producto personalmente no implica automáticamente necesitar autoalojamiento.
2. Usuario que necesita una primera experiencia guiada y casos completos: señal de aprendizaje, 7 aportes / 4 plataformas. Es nuestra interpretación de la evidencia, no una solicitud literal de un asistente.
3. Persona con varios proyectos que quiere llegar al editor rápidamente: R06, 1 aporte / 1 plataforma. Necesidad de conveniencia, no prueba de ausencia de administración de proyectos.

## Qué sigue vigente y qué no podemos asumir

- **Alojamiento:** la [documentación oficial](https://www.sanity.io/docs/studio/deployment) permite alojar Studio por cuenta propia, pero lo conecta a APIs y Content Lake de Sanity. Alojar solo el panel no equivale a tener todo el backend bajo control propio.
- **Coste:** [precios oficiales](https://www.sanity.io/pricing) ofrecen nivel gratuito y Growth de USD 15 por asiento/mes, además de consumo adicional. El nivel gratuito no incluye datasets privados. Una solución personal seguirá teniendo costes de operación, aunque no cobre asientos.
- **Facturación:** en [el hilo de R02](https://www.reddit.com/r/sanity_io/comments/1t1vj93/sanity_studio_billing/) Sanity explicó sobreconsumo por imágenes y devolvió el importe; el usuario agradeció la resolución. Mejorar visibilidad del consumo es una propuesta nuestra, no afirmar que no existan avisos.
- **Edición:** Sanity ya ofrece [edición visual y vista previa](https://www.sanity.io/docs/visual-editing/visual-editing-architecture). No se propone inventarlas como ventaja exclusiva.
- **Actualizaciones:** el [changelog](https://www.sanity.io/docs/changelog) registra mejoras y correcciones frecuentes; el índice consultado incluye soporte de singletons de septiembre de 2026. Las peticiones antiguas de ese tipo no acreditan una carencia actual. No generalizar fallos históricos de rendimiento o editor.
- **Fortalezas:** C01, C03 y T01 valoran capacidad de personalización o colaboración; R04 recomienda el servicio en sitios grandes y R05 es favorable pese a la dificultad. No hay evidencia de rechazo generalizado del producto.

## Cinco mejoras propuestas

Tamaños relativos: S = pequeño módulo, M = varias piezas, L = cambio estructural. No son plazos. Criterios propuestos, aún sin implementar.

| Propuesta | Tamaño | Evidencia y confianza | Fase | Criterio de aceptación |
|---|---|---|---|---|
| Proyecto de demostración reiniciable y guía de primer uso en español | M | Aprendizaje; la solución concreta es inferencia | architect / build / test | Crear un borrador, subir imagen, previsualizar y publicar siguiendo la guía; restaurar solo datos de prueba con confirmación. |
| Backend autoalojable con restauración documentada | L | R01 R03; débil | architect / backend / test | Crear contenido y recuperarlo desde una copia en otro entorno propio sin servicio de Sanity. |
| Indicadores de consumo y entrega de imágenes optimizadas por defecto | M | G07 R02; débil | backend / build / test | Mostrar tráfico estimado y tamaños; comprobar que la web solicita variantes adecuadas. No prometer factura exacta sin datos del proveedor. |
| Acceso centralizado a los proyectos propios | S | R06; débil | design / build / test | Buscar y abrir cada proyecto autorizado desde una sola lista. |
| Ejemplos ejecutables y diagnóstico de consultas | M | G01 G02 G06; exploratorio | architect / build / test | Ejecutar consultas de ejemplo sobre datos de prueba y explicar errores con su ubicación. No promete compatibilidad completa con GROQ. |

No se añade una supuesta corrección de subida de imágenes sin reproducir G05. Las mejoras de accesibilidad, seguridad y copias de seguridad se definirán como requisitos técnicos, no como quejas inventadas.

## Tres enfoques posibles

1. **CMS personal con backend propio.** Para proyectos donde el control de datos justifica mantenimiento. Base: R01 R03 (2 / 1). Recomendado como hipótesis para el proyecto, condicionado a confirmar que ese control te interesa.
2. **CMS con aprendizaje guiado.** Para empezar con un ejemplo funcional y entender cada capacidad. Base: 7 / 4 en aprendizaje. Complemento recomendable al enfoque anterior.
3. **Centro de proyectos de contenido.** Para gestionar múltiples sitios desde una entrada común. Base: R06 (1 / 1). Útil más adelante si aparecen varios proyectos reales.

## Proyecto de prueba propuesto, no creado

Un portal ficticio de propiedades con artículos, agentes, páginas y campañas. Contenido completamente inventado. Servirá para comprobar relaciones, imágenes, texto enriquecido, borradores, permisos, idiomas, búsqueda, publicación programada, historial y vista previa cuando cada función exista.

También harán falta escenarios técnicos específicos para concurrencia, webhooks, límites, importación y restauración: una web de ejemplo por sí sola no demuestra todas las capacidades. El inventario de replica-recon enlazará cada función con su prueba.

Siguiente decisión del usuario: continuar con replica-recon. No iniciar arquitectura ni construcción sin su confirmación. La investigación no valida demanda comercial ni garantiza que el clon cueste menos.
