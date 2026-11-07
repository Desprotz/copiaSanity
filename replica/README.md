# Evaluación inicial de Sanity para uso propio

Fecha: 6 de noviembre de 2026, America/Bogota. Fases documentadas: replica-entrepreneur, reconocimiento documental inicial con replica-recon y arquitectura con replica-architect. No se ha construido ninguna aplicación.

**Actualización 2026-11-07 — despliegue con $0:** el CMS funcionará en servicios gratuitos: Cloudflare (Worker con editor y API, Pages para la web pública, R2 para imágenes, Access para el inicio de sesión), Neon como PostgreSQL y Google Drive para copias de seguridad. Ningún PC necesita estar encendido. Las 79 funciones activas se reordenaron en M1–M6 para que M1 ya publique una web real. Detalle en `architecture.md`.

**Alcance vigente: sin IA.** La matriz tiene 79 filas activas, 6 aplazadas por IA, 1 duplicada y 3 exclusiones. El aplazamiento no elimina el objetivo futuro; no se incluye en entregas M1–M6. Siguen activas las automatizaciones convencionales y la escritura manual.

## Qué contiene

- `reviews.csv`: 17 aportaciones de 4 plataformas, con extractos literales breves, identificadores y notas de contexto. Son 11 reseñas con estrellas y 6 aportaciones de Reddit; no todas son reseñas formales.
- `themes.json`: clasificación local para esta muestra; no modifica las skills instaladas.
- `feedback.md`: salida mecánica del analizador, una vez ejecutado. Sus porcentajes no representan a todos los usuarios.
- `fixes.md`: interpretación, contraste actual y recomendación.
- `features.csv`: 81 capacidades documentadas más las 5 propuestas originales y 3 exclusiones. No es una certificación de cobertura exhaustiva de Sanity.
- `recon.md`: fuentes, superficies de trabajo, flujos, componentes, modelo conceptual, alcance y pendientes de observación práctica.
- `demo-plan.md`: datos ficticios y recorridos propuestos para probar la futura implementación.
- `architecture.md`: servicios gratuitos elegidos, límites, flujos, reglas del dominio, copias de seguridad, plan B en PC personal y seis entregas sin IA.
- `schema.sql`: diseño PostgreSQL de 31 tablas para Neon; no ejecutado ni aprobado como migración de producción.
- `api.md`: 79 contratos método/ruta propuestos (Hono en Workers), permisos y trabajos programados; ninguna API implementada.
- `design/`: sistema de diseño propio (replica-design): `tokens.json` (fuente, claro y oscuro), `tokens.css` y `tailwind.css` generados con `build_tokens.py`, `components.md` con especificaciones y `primitives.html` como muestra estática. Contraste AA verificado en ambos modos con `contrast.py` y `check_dark.py`.

La columna milestone asigna cada función activa a una etapa. clone refleja implementación real; scope identifica active/deferred_ai/duplicate/excluded. No calcular paridad del alcance activo con el analizador genérico sin aplicar este filtro: no conoce scope. Tampoco confundir una función aplazada con una función implementada.

## Método y límites

Lectura de páginas públicas, sin cuentas ni extracción masiva. Se buscó evidencia reciente, positiva y negativa. No se alcanzó el objetivo de 100 reseñas de la skill. Esta es una evaluación exploratoria, no un estudio representativo ni una validación de mercado.

G2 mostró una ficha actual con 965 reseñas, pero la lectura de la página de pros/contras devolvió otra versión con 905 y fragmentos históricos sin fecha. No se usaron sus totales como muestra leída. Otras páginas de G2 fallaron: página 1 inaccesible y página 3 con tipo de contenido no admitido. Los resultados indexados de noviembre de 2026 no se mezclaron con esos fragmentos porque no se pudo reconciliar su versión.

Capterra ofreció tres reseñas de 2021 y 2023; Trustpilot una de 2024. Reddit mostró fechas relativas inconsistentes entre índices y páginas: se dejan vacías antes que inventarlas. Algunas publicaciones promocionan herramientas de sus autores, marcado en las notas. Se excluyen respuestas de empleados como reseñas independientes; sí sirven para conocer desenlaces.

Cada fila es una aportación distinta, no cada aparición de un fragmento en una página. Se deduplicaron los fragmentos repetidos de G2. Los enlaces de G2 y Capterra llevan al listado donde se localiza al autor; los de Reddit al hilo, no a un permalink individual. Las notas permiten ubicar cada aporte.

Se conservan extractos cortos por límites de reproducción. No son textos completos. La interpretación usa el contexto de las páginas; el analizador solo clasifica los extractos. Los temas se solapan, no deben sumarse. Fechas desconocidas impiden ponderar antigüedad con fiabilidad. La media de estrellas no es una media de satisfacción de Sanity.

No se descargaron código, logos ni activos de Sanity. Las reseñas son evidencia y no testimonios para una futura web. No se ejecutaron pruebas contra Sanity.

## Fuentes de contraste

- [Precios y funciones por plan](https://www.sanity.io/pricing)
- [Alojamiento de Studio](https://www.sanity.io/docs/studio/deployment)
- [Content Lake](https://www.sanity.io/docs/content-lake)
- [Edición visual](https://www.sanity.io/docs/visual-editing/visual-editing-architecture)
- [Changelog oficial](https://www.sanity.io/docs/changelog)

Los precios y las prestaciones pueden cambiar. La recomendación se refiere a esta fecha; las reseñas antiguas no prueban defectos presentes. El reconocimiento confirmó que Dashboard y las alertas de gasto ya existen; la matriz conserva las propuestas anteriores con esa corrección y evita duplicar Dashboard.
