# Bitácora de construcción (replica-build)

Código en `apps/editor` (React 19 + TypeScript 7 + Vite 8, React Router 8, React Aria Components, Tiptap 3, Tailwind 4, Lucide, fuentes Overpass servidas desde el proyecto). Todo escrito desde cero a partir de recon.md, architecture.md y el sistema de diseño; nada de código, textos ni recursos de Sanity.

**Capa de datos:** `src/data/store.ts` define el contrato. `api-store.ts` lo implementa contra el API (`apps/api`, Neon) y es la que se usa en desarrollo (`.env.development`); `local-store.ts` queda como modo sin conexión (`VITE_DATA_SOURCE=local`). Detalle del backend en `backend.md`.

Cómo probar: `npm run dev:api` y `npm run dev` en la raíz, y abrir http://localhost:5173. «Restaurar datos de prueba» (abajo en el menú lateral) vuelve al estado inicial en Neon.

| Pantalla | Fecha | Estado | Falta | Más difícil de lo esperado |
|---|---|---|---|---|
| Shell (barra, riel, rutas, tema, baliza del sitio) | 2026-11-07 | hecho | Selector real de proyectos (M4); menú de cuenta (Access, M1 backend) | — |
| S03 Explorador documental (lista) | 2026-11-07 | hecho | Ordenar por columnas; selección múltiple (M3) | Navegación móvil: la lista necesitaba su propia barra de tipos para no dejar a la persona atrapada |
| S04 Editor documental | 2026-11-07 | parcial | Campos fecha/URL/imagen; objetos y listas anidadas (C003); valores iniciales (C006); historial (M2) | Sincronizar autoguardado con cambios de otra pestaña sin pisar nada (control de revisión + aviso de conflicto) |
| S05 Selector de referencia | 2026-11-07 | parcial | Búsqueda dentro del selector y crear destino en línea | — |
| S20 Tipos de contenido (definir modelo) | 2026-11-07 | parcial | Validaciones avanzadas por campo, campo de título elegible, migración de datos al cambiar tipos | — |
| S25 Sitio público (vista de la compilación) | 2026-11-07 | parcial | Generador estático real en Cloudflare Pages (`apps/site`), páginas de detalle, imágenes | — |
| S16 Archivos e imágenes | 2026-11-07 | parcial | Varios tamaños por imagen, recorte y punto de interés (M2), biblioteca (M4), subida a R2 (backend) | Guardar binarios: localStorage no alcanza, se usa IndexedDB como sustituto de R2 |

## Recorrido mínimo comprobado en el navegador (2026-11-07)

1. Abrir «Casa con patio en Barrio Ficticio»: el recorrido muestra «Revisado — falta 1 campo» y el botón dice «Falta: Habitaciones».
2. Escribir 3: se guarda solo, el recorrido avanza a «Publicado — listo para publicar».
3. Publicar: el tren recorre la línea, la fila pasa a «Esperando el sitio», la baliza dice «1 cambio esperando».
4. A los ~8 s la compilación agrupada termina: «En el sitio — al día», baliza verde.
5. `/sitio` muestra la propiedad con 3 habitaciones (es la foto de la compilación, no lo publicado al instante).
6. Crear el tipo «Proyecto» (línea verde, campo numérico «Año de entrega»): aparece en el menú y se pueden crear documentos.
7. Móvil (375 px): lista con barra de tipos, editor con volver, chips y botón Publicar fijo. Sin desbordamiento horizontal ni errores de consola.

## Correcciones tras la prueba del usuario (2026-11-07)

- **Publicaba «solo»:** el botón decía «Falta: X» y llevaba al campo; al completarlo, el mismo botón se convertía en «Publicar», así que un segundo clic publicaba sin querer. Ahora «Publicar» nunca cambia de función (desactivado mientras falte algo) y «Falta: X» es un enlace aparte debajo. La estación «Publicado» ya no se ilumina antes de pulsar: queda gris con «pulsa Publicar».
- **Faltaba la foto:** campo de imagen con arrastrar/elegir, optimización a WebP en el navegador (prueba: 165 KB → 17 KB), descripción obligatoria para publicar y foto visible en el sitio.

## Backend conectado (2026-11-07)

Mismo recorrido repetido contra Neon: completar Habitaciones, subir foto (guardada en Neon, 16 KB), describirla, publicar, compilación agrupada y `/sitio` con la foto. Verificado también consultando la base: documento publicado sin borrador, historial `create` → `publish`, auditoría y foto del sitio. Cada consulta tarda ~1 s en local (conexión nueva hasta Virginia); en producción lo resuelve Hyperdrive.

## Notas

- El paquete JS pesa 926 KB (292 KB comprimido) por Tiptap y React Aria. Dividirlo por rutas antes de publicar el editor.
- Comprobaciones pendientes del «definition of done» de la skill: recorrido completo solo con teclado y contenidos muy largos (60+ caracteres) en todas las pantallas.
- No hay capturas del original para comparar (el reconocimiento fue solo documental); las de `clone-screens/` sirven como referencia propia para replica-diff.
