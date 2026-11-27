---
name: Ofenix
description: CMS personal donde publicar es un recorrido visible de Borrador a En el sitio; la interfaz es ceniza y solo lo que avanza hacia el sitio se enciende en oro de brasa.
colors:
  ember: "#d99a1e"
  shell: "#1d1a18"
  shell-raised: "#2e2925"
  shell-text: "#f5f2ee"
  shell-muted: "#aaa29a"
  accent: "#1d1a18"
  accent-hover: "#3a3430"
  accent-subtle: "#e6e3df"
  on-accent: "#ffffff"
  focus: "#1d1a18"
  bg: "#eeeeec"
  surface: "#e3e3e0"
  surface-raised: "#ffffff"
  border: "#d8d6d2"
  border-input: "#77716b"
  text: "#1d1a18"
  text-muted: "#57514b"
  line-red: "#c23b3b"
  line-blue: "#3b6fd1"
  line-green: "#2f9a64"
  line-amber: "#1b9aa0"
  line-violet: "#8a5cd6"
  line-pending: "#cfccc7"
  danger: "#b8322b"
  danger-subtle: "#fbe7e5"
  on-danger: "#ffffff"
  success: "#17734a"
  warning: "#8a5300"
  warning-subtle: "#f8eed8"
  status-draft: "#7a4e00"
  status-draft-bg: "#f6ecd6"
  status-changed: "#24489c"
  status-changed-bg: "#e6ecf9"
  status-scheduled: "#5b3aa8"
  status-scheduled-bg: "#ede7f8"
  status-waiting: "#0e6870"
  status-waiting-bg: "#dcf0f0"
  status-published: "#17734a"
  status-published-bg: "#e1f1e8"
typography:
  display:
    fontFamily: "Manrope, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "36px"
    fontWeight: 800
    lineHeight: "42px"
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Manrope, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "26px"
    fontWeight: 700
    lineHeight: "32px"
  title:
    fontFamily: "Manrope, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "18px"
    fontWeight: 700
    lineHeight: "26px"
  body:
    fontFamily: "Manrope, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: "24px"
  body-sm:
    fontFamily: "Manrope, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: "20px"
  label:
    fontFamily: "Manrope, system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
    fontSize: "12px"
    fontWeight: 700
    lineHeight: "16px"
  mono:
    fontFamily: "JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: "16px"
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
  icon-button-pressed:
    backgroundColor: "{colors.accent-subtle}"
    textColor: "{colors.text}"
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
  type-chip-mobile:
    backgroundColor: "{colors.bg}"
    textColor: "{colors.text}"
    rounded: "{rounded.pill}"
    padding: "0 16px 0 12px"
    height: "44px"
  type-chip-mobile-active:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
  nav-route:
    backgroundColor: "{colors.shell}"
    textColor: "{colors.shell-text}"
    rounded: "{rounded.md}"
    padding: "9px 12px"
  nav-route-active:
    backgroundColor: "{colors.shell-raised}"
    textColor: "{colors.shell-text}"
  site-beacon:
    backgroundColor: "{colors.shell-raised}"
    textColor: "{colors.shell-text}"
    rounded: "{rounded.pill}"
    padding: "6px 14px 6px 10px"
  toast:
    backgroundColor: "{colors.shell}"
    textColor: "{colors.shell-text}"
    rounded: "{rounded.lg}"
    padding: "12px 16px 12px 12px"
  panel:
    backgroundColor: "{colors.surface-raised}"
    rounded: "{rounded.lg}"
    padding: "24px"
  publish-bar-mobile:
    backgroundColor: "{colors.surface-raised}"
    padding: "12px 16px"
---

# Design System: Ofenix

## Overview

**Creative North Star: "Brasa y ceniza"**

La interfaz es ceniza tranquila y solo lo que avanza hacia el sitio se enciende en oro de brasa. Un carbón mate envuelve la barra superior y el riel; el área de trabajo es ceniza (lista) y blanco (editor). Sobre esa calma, el oro aparece en muy pocos sitios y siempre con el mismo significado: aquí hay algo que va camino del sitio público. Todo lo demás (foco, selección, pestañas, botones pulsados) se resuelve en tinta y ceniza.

Publicar sigue siendo un viaje visible. Cada documento recorre cuatro tramos (Borrador, Revisado, Publicado, En el sitio) y quien edita siempre sabe en qué paso está y si el sitio ya lo refleja. Cada tipo de contenido es una línea de color que solo aparece como trazo redondeado. La tipografía es Manrope, una sola familia en cinco pasos, con JetBrains Mono reservada al reloj.

La complejidad visual se concentra en un gesto: el recorrido de publicación, en tramos que se llenan con resorte en el color del tipo, el paso actual que respira en oro y el tramo alcanzado que prende una sola vez. Alrededor hay movimiento suave: el documento entra con un fundido corto, las filas aparecen escalonadas, menús y diálogos se abren con un leve desplazamiento y el tema cambia con un fundido. El resto son controles planos y calmados, sin degradados ni vidrio. Claro y oscuro existen en paridad, con contraste AA comprobado en ambos (`python replica/design/contrast.py replica/design/tokens.json` y `python replica/design/check_dark.py`: 44 pares, ninguno por debajo de AA). Se rechaza el admin blanco con acento índigo del sector y cualquier parecido con otro CMS.

**Key Characteristics:**
- Concha de carbón mate + área de trabajo ceniza y blanca.
- Oro de brasa solo en lo que avanza hacia el sitio; nunca en foco, pulsado, pestañas, selección ni hover.
- Cinco líneas de color por tipo de contenido, siempre como trazo redondeado.
- Estado legible por forma + palabra + color, nunca solo color.
- Acciones como píldoras sólidas de tinta; contenedores planos de esquina suave.
- Una sola firma animada: el recorrido en tramos, con el paso actual respirando en oro y el tramo alcanzado que prende.
- Fénix en oro de brasa, sin redibujar.

## Colors

Una concha de carbón casi negro, un área de trabajo de ceniza neutra, un único oro de brasa escaso y cinco colores de línea que funcionan como señalética. Los valores de la tabla son los de claro; el oscuro cambia valores, no nombres (ver `replica/design/tokens.json`, bloque `color_dark`).

### Primary
- **Oro de brasa** (ember; oscuro `#f0b030`): el único acento cromático del mundo. Relleno del tramo actual (que respira), aro de la baliza mientras hay cambios esperando, tramo corto detrás de la línea del tipo activo en el riel, icono de la herramienta activa y el anillo «prender» que se abre una vez al alcanzar un paso.
- **Carbón mate** (shell; oscuro `#0e0c0b`): fondo de la barra superior, del riel, del aviso flotante y del inicio de sesión.
- **Carbón elevado** (shell-raised): hover y elemento activo dentro de la concha; píldora de la baliza.
- **Porcelana** (shell-text) y **porcelana atenuada** (shell-muted): texto sobre carbón; contadores y encabezados del riel en la atenuada. Sobre carbón el anillo de foco va en porcelana.
- **Placa de tinta** (accent, hover accent-hover): fondo de la acción principal, pestaña seleccionada, y chip de tipo activo en móvil. En oscuro se invierte a porcelana (`#f3efea`) con texto tinta (on-accent).
- **Anillo de tinta** (focus): anillo de foco y línea de foco de los campos en el área de trabajo; mismo valor que el texto. En oscuro, porcelana.
- **Velo de ceniza** (accent-subtle; oscuro `#2e2925`): selección de texto, botón pulsado (modo enfoque, barra de formato), halo del buscador enfocado, zona de arrastre en hover. Es neutro a propósito: no lleva tinte.

### Secondary
Las líneas por tipo de contenido. Cada tipo conserva su color en riel, migas, recorrido, mini recorrido y chips móviles.
- **Carmín** (line-red, clave `red`).
- **Azul** (line-blue, clave `blue`).
- **Verde** (line-green, clave `green`); también la baliza en calma («Sitio al día») y el aviso correcto.
- **Turquesa** (line-amber, clave `amber`): la clave se llama `amber` en datos y API por compatibilidad, pero su valor visible es turquesa para no confundirse con el oro de brasa. En la interfaz se nombra siempre «Turquesa».
- **Violeta** (line-violet, clave `violet`).
- **Tramo pendiente** (line-pending): fondo de los tramos aún no alcanzados.

### Tertiary
Pares de estado (texto + fondo suave), siempre acompañados de forma y palabra: borrador (status-draft), cambios sin publicar (status-changed), publicado esperando el sitio (status-waiting), en el sitio (status-published). Los tokens de programada (status-scheduled) existen en la paleta pero ningún estado del editor los usa todavía. Peligro (danger / danger-subtle / on-danger), éxito (success) y aviso (warning / warning-subtle) para errores, checks dibujados y banners.

### Neutral
- **Ceniza** (bg): fondo de la lista, de la barra de formato, de la zona de arrastre y de los chips de tipo móviles.
- **Ceniza hundida** (surface): hover de filas y botones fantasma, fondo del botón principal desactivado.
- **Blanco de trabajo** (surface-raised): editor, campos, fila seleccionada, paneles, diálogos y barra de publicar en móvil.
- **Filete** (border): divisores, borde de pestañas, buscador y botón secundario.
- **Borde de campo** (border-input): borde de inputs y del texto enriquecido, borde punteado de la zona de arrastre; pasa 3:1 como elemento de interfaz.
- **Tinta carbón** (text) y **tinta atenuada** (text-muted): texto principal y secundario, en el mismo carbón de la concha.

### Named Rules
**La regla de la brasa.** El oro solo marca lo que avanza hacia el sitio: el tramo actual que respira, la baliza mientras hay cambios esperando, el elemento activo del riel y el anillo «prender» de una sola vez al alcanzar un paso. Nunca en foco, botones pulsados, pestañas, selección ni hover.

**La regla del trazo.** Los colores de línea solo aparecen como trazos redondeados (6 a 8 px), rellenos de tramo; nunca como fondo de superficie ni como color de texto. Solo los tipos de contenido llevan línea: las herramientas del proyecto en el riel llevan iconos Lucide.

**La regla forma + palabra.** Ningún estado depende solo del color: borrador = aro vacío, cambios sin publicar = aro con punto, esperando el sitio = punto a medias, en el sitio = punto lleno; siempre con su palabra al lado.

**La regla del tema por rol.** Los componentes usan roles (`--cms-color-*`, clases Tailwind mapeadas), nunca hex sueltos. El oscuro se activa por `prefers-color-scheme` o por `data-theme` en la raíz y cambia valores, no nombres.

## Typography

**Display Font:** Manrope (con system-ui, -apple-system, Segoe UI, Roboto, sans-serif)
**Body Font:** Manrope
**Label/Mono Font:** JetBrains Mono 500 (con ui-monospace, SFMono-Regular, Menlo, Consolas)

**Character:** Manrope es geométrica y actual, firme en 700 y 800 sin volverse ruidosa; una sola familia sostiene toda la jerarquía. La mono es fría y precisa y solo marca el tiempo y las cantidades. Números tabulares en toda la interfaz.

### Hierarchy
- **Display** (800, 36/42, -0.02em, `text-wrap: balance`): título del documento en el editor y títulos de página. En móvil baja a la escala headline.
- **Headline** (700, 26/32): títulos de diálogo y del inicio de sesión; título del documento en móvil.
- **Title** (700, 18/26): encabezado de la lista («Propiedades») y de los paneles. Los títulos de fila usan 700 a 16 px.
- **Body** (400, 16/24): valor de los campos; el texto enriquecido usa 16 px con interlínea 1.7 y máximo 70ch.
- **Body-sm** (400, 14/20): tamaño base de la interfaz (cuerpo, botones, riel); etiquetas de campo y nombres de paso en 700, rutas del riel en 600.
- **Label** (700, 12/16): etiquetas de estado, pestañas, botón pequeño, unidades; ayudas en 500 y errores en 600. Sin mayúsculas forzadas.
- **Mono** (500, 12/16): horas, fechas cortas y contadores.

### Named Rules
**La regla del reloj.** JetBrains Mono solo para horas, fechas y contadores (hora de la fila, «compilado 19:55», contadores del riel). Las etiquetas cortas van en Manrope, también la etiqueta corta de la baliza en móvil.

**La regla de las fuentes propias.** Manrope (400 a 800) y JetBrains Mono 500 se sirven desde la propia app con @fontsource; nada se carga de terceros.

## Layout

Estructura de aplicación en rejilla: barra superior de 56 px a todo el ancho; debajo, riel de 232 px, lista de 360 px y editor flexible. El contenido del editor tiene un máximo de 760 px más su relleno (24 px arriba, 48 px a los lados, 120 px abajo). Ritmo de espaciado en base 4 sobre retícula de 8: 2, 4, 8, 12, 16, 24, 32, 48, 64. Los campos se separan 24 px; los campos cortos se agrupan en una rejilla automática de columnas de mínimo 240 px.

Bajo el título va el recorrido de publicación a todo el ancho del contenido, con Publicar a su derecha y, debajo del botón, la ayuda «Falta: …» como control aparte; un filete inferior lo separa de los campos.

**Modo enfoque.** Un botón de icono en las migas del editor oculta el riel y la lista (`data-focus="on"` en la raíz) y centra el contenido. Solo en escritorio; se apaga al salir del editor.

- **Tableta (≤ 1199 px):** riel de 72 px solo con trazos e iconos (el nombre sigue siendo el nombre accesible), lista de 300 px, editor con 24 px laterales.
- **Móvil (≤ 899 px):** una columna. Riel y lista se vuelven pantallas propias; el editor muestra arriba «Todos: …» y una fila deslizable de chips de tipo. La barra conserva logo, nombre del sitio, baliza con etiqueta corta y botón de tema. Publicar va en una barra fija inferior opaca (blanco de trabajo, filete superior, botón de 48 px a todo el ancho). Estaciones de 26 px. Sin modo enfoque. Todo objetivo táctil mide al menos 44 px.

## Elevation & Depth

Sistema plano con tonos: la profundidad la dan las capas de color (carbón, ceniza, blanco). Las sombras son escasas, difusas y teñidas de carbón (`rgba(29,26,24,…)`), y marcan un objeto que se levanta: la fila seleccionada, un panel, el icono de la zona de arrastre, la placa de acción y lo que flota (aviso, menú, diálogo, barra de publicar en móvil). El anillo «prender» es sólido, no un resplandor.

### Shadow Vocabulary
- **Tarjeta** (`box-shadow: 0 1px 2px rgba(29,26,24,.06), 0 2px 8px rgba(29,26,24,.06)`): fila seleccionada, paneles, filas de tipo, icono de la zona de arrastre.
- **Flotante** (`box-shadow: 0 12px 32px rgba(29,26,24,.18), 0 2px 6px rgba(29,26,24,.10)`): aviso, menú, diálogo, tarjeta de inicio de sesión.
- **Placa** (`box-shadow: 0 2px 6px rgba(29,26,24,.18)`, hover `0 6px 16px rgba(29,26,24,.22)`): botón principal.
- **Barra inferior móvil** (`box-shadow: 0 -6px 20px rgba(29,26,24,.10)`): barra fija de Publicar.

### Named Rules
**La regla del humo.** Toda sombra es difusa y teñida de carbón, nunca negra pura ni desplazada en duro. Los estados de foco se hacen con anillo, no con sombra.

**La regla sin vidrio.** Superficies planas y opacas: ningún desenfoque de fondo ni vidrio, tampoco en la barra de publicar móvil. El único degradado es el tramo recorrido que se calienta hacia el oro en su final.

## Shapes

Lenguaje de tramos y píldoras. Lo que se pulsa (botones, pestañas, chips de tipo, buscador, etiquetas de estado, botones de icono, baliza) es píldora completa (999px). Los contenedores tienen esquinas suaves: filas, campos, rutas del riel, menú y texto enriquecido a 10 px; paneles, banners, diálogos, zona de arrastre y aviso a 16 px; botones de la barra de formato a 6 px. Las líneas son trazos con extremos redondeados (radio igual a la mitad del grosor). El recorrido usa tramos de 10 px de alto (radio 5 px) en el editor y de 12 × 5 px en el mini recorrido; el riel, una línea de 22 × 6 px. No hay círculos de estación.

### Named Rules
**La regla de la placa.** Lo que se pulsa es una píldora; lo que contiene información es un rectángulo suave. No hay esquinas rectas en la interfaz.

**La regla del tramo.** Cada paso es un tramo propio: lleno con el color del tipo si ya se cumplió, en oro y respirando si es el actual, vacío (tramo pendiente) si falta. Nunca círculos ni estaciones.

## Components

### Buttons
Placas de tinta: sólidas, firmes, que ceden al pulsar.
- **Shape:** píldora completa (999px); 40 px de alto, 32 px el pequeño, 48 px en la barra móvil.
- **Primary:** placa de tinta con texto blanco, 700, relleno lateral de 24 px y sombra de placa. Publicar lleva una flecha que avanza 3 px en hover; ya publicado muestra «Publicado» con check.
- **Hover / Focus:** hover pasa a accent-hover y sube la sombra; al pulsar escala a .96; foco con anillo de 2 px separado 2 px, en tinta sobre el área de trabajo y en porcelana sobre carbón.
- **Disabled:** ceniza hundida, texto atenuado y filete, nunca transparencia. Lo que falta se dice en el control «Falta: Título y 2 más» debajo del botón, que lleva al primer campo pendiente; el botón nunca cambia de función.
- **Loading:** spinner de 14 px + verbo en gerundio («Publicando»).
- **Secondary / Ghost / Danger:** secundario blanco con filete que se oscurece a border-input en hover; fantasma transparente que se rellena con ceniza hundida; peligro sólido en danger.
- **Pressed (botón de icono):** velo de ceniza con anillo interior de 2 px en tinta (modo enfoque); en la barra de formato, velo de ceniza con raya inferior de 2 px en tinta.

### Chips
- **Pestañas de filtro:** píldoras blancas con filete, 12 px 700; la seleccionada se rellena con la placa de tinta.
- **Etiquetas de estado:** píldora con fondo suave del estado, texto del estado en 700 a 12 px y un glifo circular de 9 px que codifica la forma (vacío, con punto, mitad, lleno).
- **Chips de tipo (móvil):** píldoras de 44 px sobre ceniza con un trazo corto del color de la línea; el activo en placa de tinta.

### Cards / Containers
- **Corner Style:** 10 px para filas; 16 px para paneles, banners, diálogos y zona de arrastre.
- **Background:** blanco de trabajo sobre ceniza; banners en warning-subtle o danger-subtle.
- **Shadow Strategy:** sombra tarjeta para filas seleccionadas y paneles; ver Elevation & Depth.
- **Border:** ninguno en tarjetas; la fila seleccionada se distingue por superficie elevada y sombra, sin borde lateral de color.
- **Internal Padding:** 12 px en filas, 16 px en banners, 24 px en paneles y diálogos.

### Inputs / Fields
- **Style:** fondo blanco, borde de 1 px border-input, radio 10 px, relleno 10 × 14 px, texto a 16 px. Etiqueta en 700 encima («(opcional)» atenuado en 500); ayuda en 12 px atenuada debajo; unidad opcional («COP») a la derecha.
- **Focus:** el borde pasa a tinta y bajo el campo se dibuja de izquierda a derecha una línea de 3 px en tinta, como un trazo de metro (240 ms).
- **Error / Valid:** inválido = borde y línea en danger, mensaje con icono que entra deslizándose 4 px (sin sacudir el campo) y dice qué falta; guardado = check verde que se traza.
- **Buscador:** píldora de 38 px con icono a la izquierda; foco con borde de tinta y halo de 4 px en velo de ceniza.
- **Texto enriquecido:** marco con borde de campo, barra de formato sobre ceniza con botones de 34 px (radio 6 px).
- **Zona de arrastre:** borde punteado de 1.5 px, fondo ceniza, icono en círculo blanco que sube 3 px en hover; en hover el borde pasa a tinta y el fondo a velo de ceniza.

### Navigation
- **Barra superior:** 56 px de carbón mate; logo Ofenix de 28 px de alto (24 en móvil), selector de sitio (700, entorno atenuado), baliza del sitio a la derecha, tema y cuenta como botones de icono redondos.
- **Riel:** sobre carbón; grupos «Contenido», «Proyecto» y «CMS» con encabezado en 14 px 600 atenuado. Cada tipo es una fila con una línea de 22 × 6 px en su color (crece a 26 px en hover), nombre en 600 y contador en mono. Las herramientas del proyecto llevan icono Lucide atenuado. El activo lleva fondo carbón elevado y un tramo corto de oro de 6 px detrás de su línea (o icono en oro si es herramienta).
- **Mini recorrido (fila de la lista):** cuatro tramos de 12 × 5 px con 3 px de separación: llenos en el color del tipo si se cumplieron, en oro si es el paso actual, tramo pendiente si faltan. Usa el mismo cálculo que el recorrido del editor (Revisado = sin errores de validación), así lista y editor nunca dicen pasos distintos. Decorativo; la etiqueta de estado lleva el texto.

Cuatro tramos de 10 px (Borrador → Revisado → Publicado → En el sitio) en una rejilla de cuatro columnas con 6 px entre ellos, y debajo de cada uno su nombre y su nota. Lo cumplido se llena de izquierda a derecha con el color del tipo, con curva de resorte (700 ms) y 90 ms de escalonado por tramo, y su nombre lleva un check que se dibuja. El paso actual se rellena en oro hasta el 42 % y respira entre 42 % y 56 % (2,4 s); su nota va en 700. Al alcanzar un paso, su tramo prende una sola vez: un anillo de oro que se abre 8 px y se apaga (900 ms). No hay tren ni estaciones. Cada paso lleva forma (lleno, respirando, vacío), palabra y color; el estado completo se anuncia en el nombre accesible de la sección. Con «reducir movimiento» no hay animación.

### Movimiento de la interfaz
Suave y corto (140–300 ms, `cubic-bezier(.16,1,.3,1)`): cambio de documento con View Transitions (el editor sale en 140 ms y entra subiendo 8 px en 260 ms; el resto de la página se funde en 220 ms), filas de la lista que entran subiendo 6 px con 28 ms de escalonado, menús que se abren desde 4 px con escala .98 (160 ms), diálogos que entran desde 8 px sobre un velo que se funde, y cambio de tema con fundido. Con «reducir movimiento» todo se desactiva.

### Baliza del sitio
Píldora en carbón elevado con un aro de 12 px: oro y latiendo (2.4 s) mientras hay cambios esperando, azul con latido rápido mientras se compila, verde y quieto cuando el sitio está al día. Texto largo + hora en mono; en móvil, etiqueta corta en sans y el texto largo queda para lectores de pantalla.

### Aviso flotante
Rectángulo de 16 px de radio sobre carbón mate con baliza verde quieta (roja si es error, con botón Cerrar) y sombra flotante; entra desde abajo 16 px y el correcto se retira solo a los ~4 s.

### Logo
Símbolo del fénix recoloreado a oro de brasa; palabra «Ofenix» en carbón sobre fondos claros y en blanco sobre la barra de carbón. Se usa la imagen entregada (PNG, `apps/editor/public/`); la versión vectorial está pendiente del dueño.

## Do's and Don'ts

### Do:
- **Do** reservar el oro de brasa para lo que avanza hacia el sitio: tramo actual que respira, baliza con cambios esperando, elemento activo del riel y el anillo «prender».
- **Do** resolver foco, selección, pestañas y estados pulsados en tinta y velo de ceniza (anillo de 2 px en tinta; en porcelana sobre carbón).
- **Do** dibujar cada tipo de contenido como una línea de color con trazo redondeado (tramos de 10 px en el recorrido, línea de 6 px en el riel).
- **Do** acompañar cada estado con forma y palabra, además del color.
- **Do** usar píldoras completas para todo lo que se pulsa y 10 / 16 px para contenedores.
- **Do** animar los detalles entre 140 y 240 ms con `cubic-bezier(.16,1,.3,1)` y reservar el resorte para el llenado de los tramos del recorrido.
- **Do** usar JetBrains Mono solo para horas, fechas y contadores.
- **Do** usar el logo entregado: fénix en oro, palabra en carbón sobre claro y en blanco sobre carbón.
- **Do** mantener en móvil objetivos de 44 px y Publicar en una barra fija inferior opaca.

### Don't:
- **Don't** usar el oro en foco, botones pulsados, pestañas, selección ni hover.
- **Don't** usar los colores de línea como fondo de superficie o como color de texto, ni dar línea a las herramientas del proyecto.
- **Don't** mostrar la clave `amber` como «ámbar»: su color visible y su nombre son «Turquesa».
- **Don't** comunicar un estado solo con un punto de color.
- **Don't** usar degradados ni vidrio (desenfoque de fondo); el único degradado es el tramo recorrido que se calienta hacia el oro.
- **Don't** añadir otro bucle decorativo: la baliza que late es el único (el spinner de carga es funcional).
- **Don't** redibujar el fénix ni imitarlo con formas propias; recolorear solo dentro de la paleta.
- **Don't** usar sombras negras o desplazadas en duro; las sombras son difusas y teñidas de carbón.
- **Don't** atenuar con transparencia un botón desactivado; usa ceniza hundida y texto atenuado.
- **Don't** usar hex sueltos en componentes; siempre el rol del token.
