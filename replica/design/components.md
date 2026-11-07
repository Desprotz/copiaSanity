# Sistema de diseño — CMS personal

Fecha: 2026-11-07. Fases: replica-design + skill impeccable (dirección elegida por el usuario: **«Mapa de metro»**). Diseño propio: no se midió ni se tomó nada de la interfaz de Sanity. De recon.md solo se usan funciones, pantallas (S-IDs) y estados.

Archivos: [tokens.json](tokens.json) (fuente), [tokens.css](tokens.css) y [tailwind.css](tailwind.css) (generados con `python build_tokens.py`), [primitives.html](primitives.html) (muestra interactiva). Contexto del producto en [PRODUCT.md](../../PRODUCT.md); contrato de dirección en `.impeccable/surfaces/`.

## Dirección: «Mapa de metro»

Publicar es un viaje visible. Cada documento recorre una línea (Borrador → Revisado → Publicado → En el sitio) y siempre sabes en qué estación está.

- **Marca:** MSE. Logo blanco en la barra superior y favicon (archivos en [assets/](assets/), sin modificar). Azul marino `#10233d` y azul `#2f63f5` de la marca son el color de la barra, del texto, de la línea azul y del foco.
- **Mundo:** esmalte azul medianoche en la barra superior y el riel de navegación; área de trabajo porcelana fría y blanca (no crema).
- **Líneas por tipo de contenido:** Propiedades escarlata, Artículos cobalto, Agentes verde, Categorías ámbar, Páginas violeta. Aparecen solo como trazos redondeados (riel, migas, recorrido, mini recorrido), nunca como fondos.
- **Una sola firma llamativa:** el recorrido de publicación con el tren. Todo lo demás son controles estándar y calmados: esa es la respuesta a «se ve lindo pero no debe parecer complejo».
- **El estado se lee por forma y palabra, no solo por color:** borrador = estación vacía, cambios sin publicar = estación con punto, programada = estación punteada, publicado esperando el sitio = media estación (turquesa), en el sitio = estación llena.
- **Estaciones del recorrido:** siempre blancas con aro grueso (6 px) del color de la línea; la actual lleva aro azul marino y halo ámbar. Línea de 8 px.
- **Tipografía de señalética:** Overpass (derivada de la tipografía de señales de autopista) para todo; Overpass Mono solo para horas y cantidades. Licencia OFL; en la app se sirven desde el propio sitio (@fontsource). Iconos: Lucide (ISC) o SVG propios del mismo trazo.
- **Botones como placas de señal:** píldoras sólidas. Acción principal en azul medianoche (claro) o porcelana (oscuro).
- **Claro y oscuro** con contraste AA verificado en ambos.

## Detalles satisfactorios («efecto postre»)

Cada uno dura entre 140 y 900 ms, usa una curva de salida suave y se desactiva con «reducir movimiento».

| Detalle | Dónde | Qué hace |
|---|---|---|
| Tren del recorrido | Recorrido de publicación | Al publicar, un tren recorre la línea con un pequeño rebote, se queda estacionado donde llega y avanza a «En el sitio» cuando termina la compilación; cada estación hace un pequeño «pop» al llegar |
| Halo de estación actual | Recorrido | Halo ámbar fijo (sin animación repetida: el único bucle decorativo es la baliza; el indicador de carga gira solo mientras algo carga) |
| Baliza | Barra superior | Aro ámbar que late mientras hay cambios esperando la compilación; verde y quieto cuando el sitio está al día |
| Línea de foco | Campos | Al enfocar un campo se dibuja una línea bajo él, como un trazo de metro |
| Check dibujado | Campo válido y «Guardado» | La marca de verificación se traza al validar y al guardar |
| Error que entra | Campos | El mensaje entra con un pequeño desplazamiento, sin sacudir el campo |
| Botón que cede | Botones | Se hunde al 96 % al pulsar; la flecha de Publicar avanza 3 px al pasar el cursor |
| Estación del riel | Navegación | Cada tipo es un tramo de línea que atraviesa una estación; la estación crece al pasar el cursor y lleva halo ámbar en el elemento activo |
| Aviso flotante | Esquina inferior | Entra desde abajo con la baliza verde y se va solo a los 4 s |
| Superficies del navegador | Todo | Selección de texto, cursor, barras de desplazamiento y números tabulares con colores del sistema |

## Base técnica

React Aria Components (Apache 2.0) como base accesible, Tailwind v4 mapeado a los tokens (`bg-surface text-text-muted border-border`, nunca hex sueltos) y Tiptap (núcleo MIT) para texto enriquecido. Versiones exactas al instalar, en replica-build.

## Tokens (resumen)

| Grupo | Valores |
|---|---|
| Color | 38 roles en claro y oscuro: fondo, superficies, barra (shell), acción, foco, peligro, 4 estados, 5 líneas + pendiente |
| Tipo | xs 12/16 · sm 14/20 · base 16/24 · lg 18/26 · xl 26/32 · display 36/42 (800) |
| Espacio | base 4: 0 2 4 8 12 16 24 32 48 64 |
| Radio | sm 6 · md 10 · lg 16 · pill |
| Línea | grosor 8 px · estación 30 px (26 px en móvil) |
| Movimiento | fast 140 ms · base 240 ms · curva `cubic-bezier(.16,1,.3,1)` |

Contraste con `contrast.py`: **38 pares en claro y 38 en oscuro, 0 fallos AA**, incluidas las líneas de color sobre blanco y sobre la barra (3:1 como elementos de interfaz).

## Distribución

| Zona | Escritorio (≥ 1200 px) | Tableta (900–1199) | Móvil (< 900) |
|---|---|---|---|
| Barra superior (56 px) | logo MSE, proyecto, baliza con «próximo al sitio», tema, cuenta | igual | logo, selector de proyecto, baliza con etiqueta corta («2 en espera»; la hora solo en escritorio), tema |
| Riel de navegación | 232 px con nombres | 72 px, solo trazos | pantalla propia |
| Lista | 360 px | 320 px | pantalla propia |
| Editor | contenido a máx. 760 px | flexible | completo; arriba «Todas las propiedades» y chips de tipo (44 px); Publicar en barra fija elevada; botón desactivado dice qué falta («Falta: Habitaciones») |

## Voz

Español neutro con «tú». Botones con verbos concretos («Publicar», «Guardar borrador»). Errores que dicen qué falta y para qué («Escribe un número entre 1 y 20 para poder publicar»). Textos propios.

## Componentes

Formato: variantes · estados · tokens · accesibilidad · pantallas · etapa.

### Firma

```
PublishJourney (recorrido de publicación)
  partes     4 estaciones (Borrador, Revisado, Publicado, En el sitio), línea de base pendiente, línea llena del color del tipo, tren, botón Publicar
  estados    falta algo (estación Revisado con halo y «falta N campos»), listo para publicar, publicando (tren en marcha), publicado esperando compilación (halo en «En el sitio» + hora), al día, error de compilación (estación en peligro con enlace), programado (estación Publicado punteada con fecha)
  tokens     line-* según el tipo, line-pending, accent para el tren, layout-line-weight, layout-station
  a11y       región con nombre; cada cambio de estado se anuncia en aria-live; el estado completo también existe como texto; sin animación con «reducir movimiento»
  usado en   S04 (encabezado del documento), S08, S09
  etapa      M1 (programado en M2)

MiniRoute + State (fila de la lista)
  partes     4 estaciones pequeñas en el color del tipo + etiqueta de estado con forma
  a11y       el mini recorrido es decorativo (aria-hidden); la etiqueta lleva el texto
  etapa      M1

SiteBeacon (barra superior)
  estados    cambios esperando (ámbar, late), compilando, al día (verde, quieto), error (peligro)
  a11y       role=status; en móvil el texto queda solo para lectores de pantalla
  etapa      M1
```

### Primitivas

```
Button        primary, secondary, ghost, danger · sm 32 / md 40 / móvil 48 · default, hover (sombra + flecha), active (escala .96), focus-visible (anillo focus), disabled (superficie y texto atenuado, no transparencia), loading (spinner + etiqueta) · M1
IconButton    redondo 36 px; aria-label obligatorio; pressed para barras de formato · M1
TextField     etiqueta, ayuda, unidad opcional (COP), línea de foco animada, check al validar, error con icono y motivo · default, focus, inválido, válido, solo lectura, deshabilitado · M1
Select / ComboBox / Checkbox / Switch / RadioGroup   React Aria con los mismos tokens · M1
State (etiqueta de estado)   borrador, cambios sin publicar, programada, publicado esperando el sitio, en el sitio; forma + palabra + color · M1
Tabs / filtros   píldoras; seleccionada en color de acción · M1
Menu, Dialog, Tooltip, Toast, Banner, Skeleton, EmptyState   como en la versión anterior, con superficies, radios y sombras nuevas; Toast sobre la barra medianoche con baliza · M1
```

### Estructura y formulario

```
AppShell      barra azul marino MSE con logo, riel azul marino, lista porcelana, editor blanco; landmarks y «Saltar al contenido» · M1
NavRoute      tramo de línea de 32 px del color del tipo que atraviesa una estación blanca; la estación crece al pasar el cursor; activo con fondo elevado y halo ámbar; contador en mono · M1
DocumentList / DocumentRow   título, hora en mono, mini recorrido, estado; seleccionado con superficie elevada y sombra (sin borde lateral de color) · M1
SearchField   píldora con halo de foco · M1
FormField, ObjectInput, ArrayInput, ReferenceInput, ImageInput (zona de arrastre con icono que sube), RichTextEditor   mismas especificaciones funcionales de la versión anterior · M1
```

### Etapas posteriores

```
VersionPicker + DiffView (S06)      M2  versiones alineadas campo por campo a la misma escala
DateTimeZonePicker (S08)             M2  estación punteada en el recorrido al programar
QuotaMeter (I03, S14)                M2  consumo de cuotas gratuitas como líneas de capacidad
PreviewFrame (S18)                   M2
ReleaseList / ReleaseDetail (S09)    M3  varios documentos que viajan juntos: una línea con ramales
CommentThread / TaskItem (S07)       M3
WritingCanvas + FieldMapper (S21)    M3
MediaLibrary (S17), WebhookList / JobLog (S19)   M4
QueryConsole (S10), PresenceIndicator   M5
RoleEditor (S12)                     M6
```

## Comprobación

[primitives.html](primitives.html) es una pantalla de documento funcional, sin dependencias: escribe un número en Habitaciones, pulsa Publicar y mira el recorrido. Revisada a 1440 px y 375 px, en claro y oscuro, sin desbordamiento horizontal. En replica-build se rehace como componentes React en una ruta `/design`.

## Siguiente paso

`replica-build`: recorrido mínimo de punta a punta, con tu confirmación para crear cuentas e instalar dependencias.
