// Crea el sitio de prueba «Telar Norte», una tienda de ropa ficticia, con sus tipos y productos.
// Uso: node apps/api/scripts/seed-store.mjs   (vuelve a crearlo desde cero si ya existe)
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const url = process.env.DATABASE_URL ?? readFileSync(join(root, '.dev.vars'), 'utf8').split(/\r?\n/).find((l) => l.startsWith('DATABASE_URL='))?.slice(13).trim();
const SITE = 'tienda-ropa';

const f = (key, label, kind, required, extra = {}) => ({ key, label, kind, required, ...extra });
const types = [
  { id: 'portada', name: 'Portada', plural: 'Portada', color: 'amber', titleField: 'titulo', fields: [
    f('titulo', 'Título grande', 'string', true),
    f('subtitulo', 'Texto bajo el título', 'text', false),
    f('aviso', 'Aviso superior', 'string', false, { help: 'Una línea corta, por ejemplo «Envío gratis desde $200.000».' }),
    f('imagen', 'Imagen de portada', 'image', false),
  ] },
  { id: 'coleccion', name: 'Colección', plural: 'Colecciones', color: 'violet', titleField: 'nombre', fields: [
    f('nombre', 'Nombre', 'string', true),
    f('descripcion', 'Descripción corta', 'text', false),
    f('color', 'Color de la colección', 'string', false, { help: 'En formato #rrggbb, por ejemplo #2b3a67.' }),
  ] },
  { id: 'producto', name: 'Producto', plural: 'Productos', color: 'red', titleField: 'nombre', fields: [
    f('nombre', 'Nombre', 'string', true),
    f('precio', 'Precio', 'number', true, { min: 1000, unit: 'COP', help: 'Sin decimales.' }),
    f('coleccion', 'Colección', 'reference', true, { refType: 'coleccion' }),
    f('color', 'Color de la prenda', 'string', false, { help: 'En formato #rrggbb. Se usa si no hay foto.' }),
    f('foto', 'Foto', 'image', false),
    f('tallas', 'Tallas', 'string', false, { help: 'Separadas por coma: XS, S, M, L, XL' }),
    f('destacado', 'Mostrar en la portada', 'boolean', false),
    f('agotado', 'Agotado', 'boolean', false),
    f('descripcion', 'Descripción', 'richtext', false),
  ] },
];

const colecciones = [
  ['col_lino', 'Lino de verano', 'Prendas frescas para días largos.', '#c2733f'],
  ['col_denim', 'Índigo', 'Denim lavado a mano, cortes rectos.', '#2b3a67'],
  ['col_noche', 'Noche', 'Negros, grafitos y un poco de brillo.', '#1d1d1f'],
];
const productos = [
  ['prod_camisa_lino', 'Camisa de lino oversize', 149000, 'col_lino', '#d9a27b', 'S, M, L, XL', true, false],
  ['prod_pantalon_lino', 'Pantalón de lino con pretina', 179000, 'col_lino', '#b8956a', 'XS, S, M, L', false, false],
  ['prod_vestido_lino', 'Vestido camisero terracota', 219000, 'col_lino', '#a4502c', 'XS, S, M', true, false],
  ['prod_chaqueta_denim', 'Chaqueta índigo clásica', 249000, 'col_denim', '#33467d', 'S, M, L, XL', true, false],
  ['prod_jean_recto', 'Jean recto tiro alto', 189000, 'col_denim', '#3f5694', 'XS, S, M, L, XL', false, false],
  ['prod_camisa_denim', 'Camisa denim liviana', 159000, 'col_denim', '#6f86bd', 'S, M, L', false, true],
  ['prod_blazer_noche', 'Blazer grafito sin forro', 289000, 'col_noche', '#3a3a3d', 'S, M, L', true, false],
  ['prod_top_noche', 'Top satinado negro', 99000, 'col_noche', '#1c1c1e', 'XS, S, M, L', false, false],
];

const sql = postgres(url, { max: 1, onnotice: () => {} });
try {
  await sql.begin(async (tx) => {
    await tx`delete from cms.sites where id = ${SITE}`;
    await tx`insert into cms.sites (id, name, public_url) values (${SITE}, 'Telar Norte (prueba)', 'https://tienda-ropa.desprotz01.workers.dev')`;
    // pending = 1 y vencido: la próxima tarea programada (o «Actualizar el sitio ahora») compila y publica en KV.
    await tx`insert into cms.site_state (site_id, pending, next_build_at) values (${SITE}, 1, now())`;
    for (const [i, t] of types.entries()) {
      await tx`insert into cms.content_types (site_id, id, name, plural, color, title_field, fields, created_at)
        values (${SITE}, ${t.id}, ${t.name}, ${t.plural}, ${t.color}, ${t.titleField}, ${tx.json(t.fields)}, now() + make_interval(secs => ${i / 1000}))`;
    }
    const put = async (id, type, data) => {
      await tx`insert into cms.documents (site_id, id, type_id, published, published_at) values (${SITE}, ${id}, ${type}, ${tx.json(data)}, now())`;
      await tx`insert into cms.revisions (site_id, document_id, rev, action, data) values (${SITE}, ${id}, 1, 'publish', ${tx.json(data)})`;
    };
    await put('portada_1', 'portada', { titulo: 'Ropa que se queda contigo', subtitulo: 'Prendas de lino, índigo y noche hechas en talleres pequeños. Pocas piezas, bien hechas, para usarlas muchos años.', aviso: 'Tienda de prueba: los productos y precios son ficticios.' });
    for (const [id, nombre, descripcion, color] of colecciones) await put(id, 'coleccion', { nombre, descripcion, color });
    for (const [id, nombre, precio, coleccion, color, tallas, destacado, agotado] of productos) {
      await put(id, 'producto', { nombre, precio, coleccion, color, tallas, destacado, agotado, descripcion: `<p>${nombre}. Prenda de ejemplo para la tienda de prueba: tela, medidas y precio son ficticios.</p>` });
    }
  });
  console.log(`Sitio «${SITE}» creado con ${productos.length} productos y ${colecciones.length} colecciones.`);
} finally { await sql.end(); }
