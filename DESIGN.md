---
name: Editor MSE
description: CMS personal donde publicar es un recorrido de metro visible, de Borrador a En el sitio.
colors:
  shell: "#10233d"
  shell-raised: "#1a2b55"
  shell-text: "#f4f6fb"
  shell-muted: "#a9b6d3"
  accent: "#13254d"
  accent-hover: "#203a72"
  accent-subtle: "#e3ebfb"
  on-accent: "#ffffff"
  focus: "#2f63f5"
  bg: "#eef2f7"
  surface: "#e4e9f1"
  surface-raised: "#ffffff"
  border: "#d3dae5"
  border-input: "#6f7b90"
  text: "#10233d"
  text-muted: "#4a5670"
  line-red: "#d93a33"
  line-blue: "#2f63f5"
  line-green: "#1f9a62"
  line-amber: "#e8a21a"
  line-violet: "#8a5cd6"
  line-pending: "#c3cbd8"
  danger: "#c0322b"
  danger-subtle: "#fbe7e5"
  on-danger: "#ffffff"
  success: "#17734a"
  warning: "#8a5300"
  warning-subtle: "#fdf1d8"
  status-draft: "#8a5300"
  status-draft-bg: "#fdf1d8"
  status-changed: "#1f4fbf"
  status-changed-bg: "#e3ebfb"
  status-scheduled: "#5b3aa8"
  status-scheduled-bg: "#eee8fb"
  status-waiting: "#0e6870"
  status-waiting-bg: "#dcf2f3"
  status-published: "#17734a"
  status-published-bg: "#e1f4ea"
typography:
  display:
    fontFamily: "Overpass, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "36px"
    fontWeight: 800
    lineHeight: "42px"
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Overpass, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "26px"
    fontWeight: 700
    lineHeight: "32px"
  title:
    fontFamily: "Overpass, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "18px"
    fontWeight: 700
    lineHeight: "26px"
  body:
    fontFamily: "Overpass, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: "24px"
  body-sm:
    fontFamily: "Overpass, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: "20px"
  label:
    fontFamily: "Overpass, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "12px"
    fontWeight: 700
    lineHeight: "16px"
  mono:
    fontFamily: "Overpass Mono, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: "16px"
    letterSpacing: "0"
rounded:
  sm: "6px"
  md: "10px"
  lg: "16px"
  pill: "999px"
spacing:
  "0": "0px"
  "1": "2px"
  "2": "4px"
  "3": "8px"
  "4": "12px"
  "5": "16px"
  "6": "24px"
  "7": "32px"
  "8": "48px"
  "9": "64px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.pill}"
    padding: "0 24px"
    height: "40px"
  button-primary-hover:
    backgroundColor: "{colors.accent-hover}"
    textColor: "{colors.on-accent}"
  button-primary-disabled:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-muted}"
  button-secondary:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.text}"
    rounded: "{rounded.pill}"
    padding: "0 24px"
    height: "40px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.text}"
    rounded: "{rounded.pill}"
    padding: "0 24px"
    height: "40px"
  button-ghost-hover:
    backgroundColor: "{colors.surface}"
  button-danger:
    backgroundColor: "{colors.danger}"
    textColor: "{colors.on-danger}"
    rounded: "{rounded.pill}"
    padding: "0 24px"
    height: "40px"
  button-sm:
    typography: "{typography.label}"
    padding: "0 16px"
    height: "32px"
  icon-button:
    backgroundColor: "transparent"
    rounded: "{rounded.pill}"
    size: "36px"
  input-text:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.text}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "10px 14px"
  search-field:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.text}"
    rounded: "{rounded.pill}"
    padding: "0 16px 0 38px"
    height: "38px"
  tab:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.text}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "5px 12px"
  tab-selected:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
  state-chip:
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "3px 10px 3px 8px"
  nav-route:
    backgroundColor: "{colors.shell}"
    textColor: "{colors.shell-text}"
    rounded: "{rounded.md}"
    padding: "9px 12px"
  nav-route-active:
    backgroundColor: "{colors.shell-raised}"
    textColor: "{colors.shell-text}"
  toast:
    backgroundColor: "{colors.shell}"
    textColor: "{colors.shell-text}"
    rounded: "{rounded.lg}"
    padding: "12px 16px 12px 12px"
  panel:
    backgroundColor: "{colors.surface-raised}"
    rounded: "{rounded.lg}"
    padding: "24px"
---

# Design System: Editor MSE

## Overview

**Creative North Star: "Mapa de metro"**

Publicar es un viaje visible. Cada documento recorre una línea de metro con cuatro estaciones (Borrador, Revisado, Publicado, En el sitio) y quien edita siempre sabe en qué estación está. El sistema rechaza el editor gris con un punto de color por estado: el estado se dibuja como un recorrido, con trazos gruesos redondeados y estaciones blancas de aro grueso, como en un plano de transporte.

El mundo tiene dos materiales. Un esmalte azul medianoche (el azul marino de MSE) envuelve la barra superior y el riel de navegación; el área de trabajo es porcelana fría (lista) y blanco (editor), nunca crema. Cada tipo de contenido es una línea con color propio que solo aparece como trazo. La tipografía viene de la señalética de autopista (Overpass) y los botones son placas de señal: píldoras sólidas.

La complejidad visual se concentra en un solo gesto, el recorrido de publicación con su tren que avanza con resorte; todo lo demás son controles estándar, calmados y densos en la medida justa para una herramienta de trabajo. Claro y oscuro existen en paridad, con contraste AA comprobado en ambos (`contrast.py`, `check_dark.py`).

**Key Characteristics:**
- Concha azul medianoche + área de trabajo porcelana y blanca.
- Cinco líneas de color por tipo de contenido, siempre como trazo redondeado.
- Estaciones blancas con aro grueso; la actual lleva aro azul marino y halo ámbar.
- Estado legible por forma + palabra + color, nunca solo color.
- Acciones como píldoras sólidas; una única firma animada (el tren).
- Logo MSE tal como se entrega, blanco sobre la barra medianoche.

## Colors

Una concha azul marino casi tinta, una superficie de trabajo de porcelana fría y cinco colores de línea saturados que funcionan como señalética, no como decoración.

### Primary
- **Esmalte medianoche** (shell): fondo de la barra superior, del riel de navegación y del aviso flotante. Es el azul marino de la marca MSE; en oscuro baja a casi negro azulado.
- **Medianoche elevado** (shell-raised): hover y elemento activo dentro de la concha, píldora de la baliza.
- **Placa de acción** (accent): fondo de la acción principal, pestaña seleccionada, chip de tipo activo en móvil y cuerpo del tren. Un punto más profundo que la concha para que la placa se lea como objeto. En oscuro la acción se invierte a porcelana clara (`#e8edf6`) con texto azul marino.
- **Azul señal MSE** (focus): anillo de foco, línea de foco de los campos, cursor de texto. Es el azul de la marca y el mismo valor que la línea cobalto.

### Secondary
Las líneas por tipo de contenido. Cada tipo conserva su color en riel, migas, recorrido, mini recorrido y chips móviles.
- **Escarlata** (line-red): Propiedades.
- **Cobalto** (line-blue): Artículos.
- **Verde andén** (line-green): Agentes; también la baliza en calma («sitio al día»).
- **Ámbar** (line-amber): Categorías; además es el color del halo de la estación actual, del aro de la baliza que late y de las luces del tren.
- **Violeta** (line-violet): Páginas.
- **Vía pendiente** (line-pending): tramo y aro de las estaciones aún no alcanzadas.

### Tertiary
Pares de estado (texto + fondo suave), siempre acompañados de forma y palabra: borrador (status-draft), cambios sin publicar (status-changed), programada (status-scheduled), publicado esperando el sitio (status-waiting, turquesa), en el sitio (status-published). Peligro (danger / danger-subtle / on-danger), éxito (success) y aviso (warning / warning-subtle) para errores, checks dibujados y banners.

### Neutral
- **Porcelana fría** (bg): fondo de la lista, de la barra de formato y de la zona de arrastre.
- **Porcelana hundida** (surface): hover de filas y botones fantasma, fondo del botón principal desactivado.
- **Blanco de trabajo** (surface-raised): editor, campos, fila seleccionada, paneles.
- **Filete** (border): divisores, bordes de pestañas, buscador y botón secundario.
- **Borde de campo** (border-input): borde de inputs y del editor de texto, borde dashed de la zona de arrastre; pasa 3:1 como elemento de interfaz.
- **Tinta azul marino** (text) y **tinta atenuada** (text-muted): texto principal y secundario; el texto es el mismo azul marino de la marca, no negro.

### Named Rules
**La regla del trazo.** Los colores de línea solo aparecen como trazos redondeados (6 a 8 px de grosor), aros de estación, halos y puntos de luz. Nunca como fondo de superficie ni como color de texto.

**La regla forma + palabra.** Ningún estado depende solo del color: borrador = estación vacía, cambios sin publicar = estación con punto, programada = aro punteado, esperando el sitio = media estación, en el sitio = estación llena; siempre con su palabra al lado.

**La regla del tema por rol.** Los componentes usan roles (`--cms-color-*`, clases Tailwind mapeadas), nunca hex sueltos. El oscuro cambia valores, no nombres; se activa por `prefers-color-scheme` o por `data-theme` en la raíz.

## Typography

**Display Font:** Overpass (con system-ui, -apple-system, Segoe UI, Roboto, sans-serif)
**Body Font:** Overpass
**Label/Mono Font:** Overpass Mono (con ui-monospace, SFMono-Regular, Menlo, Consolas)

**Character:** Overpass deriva de la tipografía de señales de autopista: clara a distancia, ancha y de trazo firme, con pesos altos (700 y 800) para títulos y etiquetas. La mono es su gemela y solo marca el tiempo y las cantidades. Números tabulares en toda la interfaz.

### Hierarchy
- **Display** (800, 36/42, -0.02em, `text-wrap: balance`): título del documento en el editor. En móvil baja a la escala headline.
- **Headline** (700, 26/32): títulos de sección de la hoja de componentes; título del documento en móvil.
- **Title** (700, 18/26): encabezado de la lista («Propiedades»). Los títulos de fila usan 700 a 16 px.
- **Body** (400, 16/24): valor de los campos; el editor de texto enriquecido usa 16 px con interlínea 1.7 y máximo 70ch.
- **Body-sm** (400, 14/20): tamaño base de la interfaz (cuerpo, botones, riel); nombres de estación y etiquetas de campo en 700.
- **Label** (700, 12/16): etiquetas de estado, pestañas, botón pequeño, ayudas (500) y errores (600). Sin mayúsculas forzadas.
- **Mono** (500, 12/16): horas, fechas cortas y contadores.

### Named Rules
**La regla del reloj.** Overpass Mono solo para horas, fechas y contadores (hora de la fila, «próximo al sitio 14:05», contadores del riel). Las etiquetas cortas, aunque sean breves, van en Overpass.

**La regla de las fuentes propias.** Overpass y Overpass Mono (OFL) se sirven desde el propio sitio en la app; el enlace a Google Fonts es solo de la muestra.

## Layout

Estructura de aplicación en rejilla: barra superior de 56 px a todo el ancho; debajo, riel de 232 px, lista de 360 px y editor flexible. El contenido del editor tiene un máximo de 760 px más su relleno (24 px arriba, 48 px a los lados, 120 px abajo). Ritmo de espaciado en base 4: 2, 4, 8, 12, 16, 24, 32, 48, 64. Los campos se separan 24 px; los campos cortos se agrupan en una rejilla automática de columnas de mínimo 240 px.

Bajo el título va el recorrido de publicación a todo el ancho del contenido, con el botón Publicar a su derecha y un filete inferior que lo separa de los campos.

- **Tableta (≤ 1199 px):** riel de 72 px solo con trazos y estaciones (sin nombres ni contadores), lista de 320 px, editor con 24 px laterales.
- **Móvil (≤ 899 px):** una columna. Riel y lista se vuelven pantallas propias; el editor muestra arriba «Todas las propiedades» y una fila deslizable de chips de tipo. La barra conserva logo, nombre del proyecto truncado, baliza con etiqueta corta en sans y botón de tema. Publicar va en una barra fija inferior (botón de 48 px a todo el ancho) con fondo blanco al 88 % y desenfoque. Estaciones de 26 px. Todo objetivo táctil mide al menos 44 px.

## Elevation & Depth

Sistema plano con tonos: la profundidad la dan las capas de color (concha medianoche, porcelana, blanco). Las sombras son escasas, suaves y teñidas de azul marino, y marcan un objeto que se levanta: la fila seleccionada, un panel, el icono de la zona de arrastre, la placa de acción, el tren y lo que flota (aviso, barra de publicar en móvil).

### Shadow Vocabulary
- **Tarjeta** (`box-shadow: 0 1px 2px rgba(15,29,58,.06), 0 2px 8px rgba(15,29,58,.06)`): fila seleccionada, paneles, icono de la zona de arrastre.
- **Flotante** (`box-shadow: 0 12px 32px rgba(15,29,58,.18), 0 2px 6px rgba(15,29,58,.10)`): aviso flotante.
- **Placa** (`box-shadow: 0 2px 6px rgba(15,29,58,.18)`, hover `0 6px 16px rgba(15,29,58,.22)`): botón principal.
- **Tren** (`box-shadow: 0 4px 12px rgba(15,29,58,.28)`): el tren del recorrido.
- **Barra inferior móvil** (`box-shadow: 0 -6px 20px rgba(15,29,58,.10)`): barra fija de Publicar.

### Named Rules
**La regla de la sombra marina.** Toda sombra es difusa y teñida de azul marino (`rgba(15,29,58,…)`), nunca negra ni desplazada en duro. Los estados de foco se hacen con anillo, no con sombra.

## Shapes

Lenguaje de plano de transporte: círculos y píldoras. Las acciones (botones, pestañas, chips de tipo, buscador, etiquetas de estado, botones de icono, baliza) son píldoras completas (999px). Los contenedores tienen esquinas suaves: filas, campos, rutas del riel y editor de texto a 10 px; paneles, banners, zona de arrastre y aviso a 16 px; botones de la barra de formato a 6 px. Las líneas son trazos con extremos redondeados (radio igual a la mitad del grosor). Las estaciones son círculos blancos con aro grueso: 6 px en el recorrido (30 px de diámetro), 3 px en el riel (14 px), 2.5 px en el mini recorrido (11 px).

### Named Rules
**La regla de la placa.** Lo que se pulsa es una píldora; lo que contiene información es un rectángulo suave. No hay esquinas rectas en la interfaz.

**La regla de la estación blanca.** Las estaciones son siempre blancas puras, también en oscuro, con aro del color de la línea si ya se alcanzaron, aro pendiente si no, y aro azul marino con halo ámbar si es la actual.

## Components

### Buttons
Placas de señal: sólidas, firmes, que ceden al pulsar.
- **Shape:** píldora completa (999px); 40 px de alto, 32 px el pequeño, 48 px en la barra móvil.
- **Primary:** placa de acción con texto blanco, 700, relleno lateral de 24 px y sombra de placa. Publicar lleva una flecha que avanza 3 px en hover.
- **Hover / Focus:** hover pasa a accent-hover y sube la sombra; al pulsar escala a .96; foco con anillo azul de 2 px separado 2 px.
- **Disabled:** superficie hundida, texto atenuado y borde, nunca transparencia; el botón Publicar desactivado dice qué falta («Falta: Habitaciones»).
- **Loading:** spinner de 14 px + verbo en gerundio («Publicando»).
- **Secondary / Ghost / Danger:** secundario blanco con filete que se oscurece a border-input en hover; fantasma transparente que se rellena con superficie hundida; peligro sólido en danger.

### Chips
- **Pestañas de filtro:** píldoras blancas con filete, 12 px 600; la seleccionada se rellena con la placa de acción.
- **Etiquetas de estado:** píldora con fondo suave del estado, texto del estado en 700 a 12 px y un glifo circular de 9 px que codifica la forma (vacío, con punto, punteado, mitad, lleno).
- **Chips de tipo (móvil):** píldoras de 44 px sobre porcelana con un trazo corto del color de la línea; el activo en placa de acción.

### Cards / Containers
- **Corner Style:** 10 px para filas; 16 px para paneles, banners y zona de arrastre.
- **Background:** blanco de trabajo sobre porcelana; banner de aviso en warning-subtle.
- **Shadow Strategy:** sombra tarjeta para filas seleccionadas y paneles; ver Elevation & Depth.
- **Border:** ninguno en tarjetas; la fila seleccionada se distingue por superficie elevada y sombra, sin borde lateral de color.
- **Internal Padding:** 12 px en filas, 16 px en banners, 24 px en paneles.

### Inputs / Fields
- **Style:** fondo blanco, borde de 1 px border-input, radio 10 px, relleno 10 × 14 px, texto a 16 px. Etiqueta en 700 encima; ayuda en 12 px atenuada debajo; unidad opcional («COP») alineada a la derecha.
- **Focus:** el borde pasa a azul señal y bajo el campo se dibuja de izquierda a derecha una línea de 3 px, como un trazo de metro (240 ms).
- **Error / Valid:** inválido = borde y línea en danger, mensaje con icono que entra deslizándose 4 px (sin sacudir el campo) y dice qué falta y para qué; válido = check verde que se traza dentro del campo.
- **Buscador:** píldora de 38 px con icono a la izquierda; foco con borde azul y halo de 4 px en accent-subtle.
- **Texto enriquecido:** marco con borde de campo, barra de formato sobre porcelana con botones de 34 px (radio 6 px); botón activo en accent-subtle con icono azul.
- **Zona de arrastre:** borde dashed de 1.5 px, fondo porcelana, icono en círculo blanco que sube 3 px en hover.

### Navigation
- **Barra superior:** 56 px de esmalte medianoche; logo MSE blanco (22 px de alto, 18 en móvil), selector de proyecto (700, entorno atenuado), baliza del sitio en píldora a la derecha, tema y cuenta como botones de icono redondos.
- **Riel:** sobre medianoche; grupos con encabezado en 14 px 600 atenuado; cada tipo es una fila con un tramo de línea de 32 × 6 px atravesado por una estación blanca, nombre en 600 y contador en mono. Hover en shell-raised y la estación crece a 1.15; el activo lleva fondo shell-raised y halo ámbar en su estación.
- **Mini recorrido (fila de la lista):** cuatro estaciones de 11 px unidas por tramos de 4 px en el color del tipo; decorativo, la etiqueta de estado lleva el texto.

### Recorrido de publicación (firma)
Cuatro estaciones de 30 px repartidas en cuatro columnas sobre una vía pendiente de 8 px; la parte recorrida se rellena con el color del tipo. La estación actual lleva aro azul marino, halo ámbar fijo de 5 px y su subtítulo en 700. Al publicar aparece el tren (píldora de 38 × 18 px en placa de acción con dos luces ámbar) que viaja con la curva de resorte en 1000 ms y queda estacionado sobre la línea justo antes de la estación alcanzada, sin taparla; la estación hace un «pop» a 1.22 al llegar. Cada cambio se anuncia en una región `aria-live`; con «reducir movimiento» no hay animación.

### Baliza del sitio
Píldora en shell-raised con un aro de 12 px: ámbar y latiendo mientras hay cambios esperando la compilación, verde y quieto cuando el sitio está al día. `role=status`; en móvil el texto largo queda para lectores de pantalla y se muestra una etiqueta corta en sans.

### Aviso flotante
Rectángulo de 16 px de radio sobre esmalte medianoche con baliza verde quieta y sombra flotante; entra desde abajo 16 px y se retira solo a los ~4 s.

## Do's and Don'ts

### Do:
- **Do** dibujar cada tipo de contenido como una línea de color con trazo redondeado y estaciones blancas de aro grueso (línea de 8 px, estación de 30 px en el recorrido).
- **Do** acompañar cada estado con forma y palabra, además del color.
- **Do** usar píldoras completas para todo lo que se pulsa y 10 / 16 px para contenedores.
- **Do** animar los detalles entre 140 y 240 ms con `cubic-bezier(.16,1,.3,1)` y reservar el resorte solo para el tren y el relleno del recorrido.
- **Do** usar Overpass Mono solo para horas, fechas y contadores.
- **Do** usar el logo MSE tal como se entrega: blanco sobre medianoche, a color sobre fondos claros.
- **Do** mantener en móvil objetivos de 44 px y la acción Publicar en la barra fija inferior.

### Don't:
- **Don't** usar los colores de línea como fondo de superficie o como color de texto.
- **Don't** comunicar un estado solo con un punto de color.
- **Don't** añadir un segundo gesto llamativo ni otro bucle decorativo: la baliza que late es el único (el spinner de carga es funcional).
- **Don't** redibujar, recolorear ni imitar el logo MSE con formas propias.
- **Don't** usar sombras negras o desplazadas en duro; las sombras son difusas y teñidas de azul marino.
- **Don't** atenuar con transparencia un botón desactivado; usa superficie hundida y texto atenuado.
- **Don't** usar hex sueltos en componentes; siempre el rol del token.
