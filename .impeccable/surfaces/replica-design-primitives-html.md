---
version: 1
slug: "replica-design-primitives-html"
primary_target: "replica/design/primitives.html"
related_targets: []
---

# Surface: editor del CMS (muestra de primitivas y pantalla de documento)

Mode: operate. Audience: el dueño hoy; colaboradores y clientes sin experiencia después. Task: crear, editar y publicar contenido y saber si el sitio público está al día. Constraint: intuitivo sin curso; sentirse exclusivo, de vanguardia y satisfactorio de usar. User steer (2026-11-07): eligió «Mapa de metro» porque se ve «como comer un postre», pero teme que parezca complejo: la complejidad visual se concentra en un solo gesto; el resto es calmado y estándar.

## Direction contract

THESIS: Publicar es un viaje visible. Cada documento recorre una línea de metro (Borrador → Revisado → Publicado → En el sitio) y siempre sabes en qué estación está. Rechaza el editor gris con un punto de color por estado.

OWN-WORLD: Esmalte azul medianoche en la barra superior y el riel de navegación; área de trabajo porcelana fría y blanca. Cada tipo de contenido es una línea con color propio (escarlata, cobalto, verde, ámbar) que solo aparece como trazo grueso redondeado. Estaciones blancas con aro grueso. Tipografía de señalética de autopista (Overpass) y Overpass Mono para horas. Botones como placas de señal: píldoras sólidas.

STORY: El editor entiende de un vistazo qué falta para publicar, pulsa Publicar, ve el tren avanzar hasta «En el sitio» y confía.

FIRST VIEWPORT: Barra medianoche de 56 px (proyecto a la izquierda, «Próximo al sitio 14:05» a la derecha). Riel izquierdo de 232 px con líneas por tipo. Lista de 360 px con mini recorrido + palabra de estado por fila. Editor blanco: título grande, debajo el recorrido de publicación a todo el ancho del contenido con la estación actual con halo; botón Publicar a la derecha del recorrido; campos estándar debajo.

FORM: Mapa de metro (challenger wayfinding-cartography-signage-midnight-transit-diagram), elegido por el usuario sobre la dirección asignada (posición 3 de mi lista). seed:850e5f9af605aa4d. Firma: el tren que viaja por el recorrido al publicar, con resorte, y las estaciones que se llenan.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
