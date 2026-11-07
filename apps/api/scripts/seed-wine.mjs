// Crea el sitio de prueba «Viña Sotará», una bodega ficticia, con sus tipos y vinos.
// Uso: node apps/api/scripts/seed-wine.mjs   (lo vuelve a crear desde cero si ya existe)
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const url = process.env.DATABASE_URL ?? readFileSync(join(root, '.dev.vars'), 'utf8').split(/\r?\n/).find((l) => l.startsWith('DATABASE_URL='))?.slice(13).trim();
const SITE = 'vinos';

const f = (key, label, kind, required, extra = {}) => ({ key, label, kind, required, ...extra });
const types = [
  { id: 'portada', name: 'Portada', plural: 'Portada', color: 'amber', titleField: 'titulo', fields: [
    f('titulo', 'Título grande', 'string', true),
    f('subtitulo', 'Texto bajo el título', 'text', false),
    f('aviso', 'Aviso superior', 'string', false),
    f('historia', 'Historia de la bodega', 'richtext', false),
  ] },
  { id: 'linea', name: 'Línea', plural: 'Líneas', color: 'violet', titleField: 'nombre', fields: [
    f('nombre', 'Nombre', 'string', true),
    f('descripcion', 'Descripción corta', 'text', false),
  ] },
  { id: 'vino', name: 'Vino', plural: 'Vinos', color: 'red', titleField: 'nombre', fields: [
    f('nombre', 'Nombre del vino', 'string', true),
    f('tipo', 'Tipo', 'string', true, { help: 'tinto, blanco, rosado o espumoso' }),
    f('cepa', 'Cepa', 'string', true, { help: 'Ej.: Malbec, Cabernet Sauvignon, Chardonnay' }),
    f('cosecha', 'Cosecha', 'number', true, { min: 1990, max: 2100 }),
    f('linea', 'Línea', 'reference', true, { refType: 'linea' }),
    f('precio', 'Precio', 'number', true, { min: 1000, unit: 'COP' }),
    f('alcohol', 'Grado alcohólico', 'string', false, { help: 'Ej.: 13,5 %' }),
    f('region', 'Región', 'string', false),
    f('etiqueta', 'Color de la etiqueta', 'string', false, { help: 'Formato #rrggbb. Se usa para dibujar la botella si no hay foto.' }),
    f('foto', 'Foto de la botella', 'image', false),
    f('maridaje', 'Maridaje', 'text', false),
    f('notas', 'Notas de cata', 'richtext', false),
    f('destacado', 'Mostrar en la portada', 'boolean', false),
    f('agotado', 'Agotado', 'boolean', false),
  ] },
];

const lineas = [
  ['lin_reserva', 'Gran Reserva', 'Nuestros vinos de guarda: 18 meses en roble francés y paciencia en botella.'],
  ['lin_ladera', 'Ladera', 'Vinos de altura, frescos y directos, de las parcelas más altas del valle.'],
  ['lin_bruma', 'Bruma', 'Blancos, rosados y burbujas para la mesa de todos los días.'],
];
// [id, nombre, tipo, cepa, cosecha, linea, precio, alcohol, etiqueta, maridaje, notas, destacado, agotado]
const vinos = [
  ['vin_sotara_malbec', 'Sotará Gran Reserva', 'tinto', 'Malbec', 2019, 'lin_reserva', 189000, '14,2 %', '#e8dcc0', 'Cordero al horno, quesos madurados, chocolate amargo.', 'Ciruela negra y violeta en nariz. Boca amplia, taninos firmes y un final largo de cacao y especias.', true, false],
  ['vin_sotara_cabernet', 'Sotará Gran Reserva', 'tinto', 'Cabernet Sauvignon', 2018, 'lin_reserva', 205000, '14,0 %', '#1f1a17', 'Lomo a la brasa, hongos, carnes de caza.', 'Grosella, pimiento asado y cedro. Estructura seria, pide decantador y una hora de aire.', true, false],
  ['vin_ladera_pinot', 'Ladera Alta', 'tinto', 'Pinot Noir', 2022, 'lin_ladera', 98000, '12,8 %', '#c94f3d', 'Salmón, pato, pastas con hongos.', 'Cereza ácida y frutillas silvestres. Liviano, jugoso, se sirve un poco frío.', true, false],
  ['vin_ladera_syrah', 'Ladera Alta', 'tinto', 'Syrah', 2021, 'lin_ladera', 92000, '13,6 %', '#2c4a3e', 'Costillas BBQ, chorizo, berenjena asada.', 'Mora, pimienta negra y un toque ahumado. Taninos suaves y mucha fruta.', false, false],
  ['vin_bruma_chardonnay', 'Bruma', 'blanco', 'Chardonnay', 2023, 'lin_bruma', 76000, '13,0 %', '#d9c46a', 'Pescados blancos, pollo al limón, quesos frescos.', 'Manzana verde, pera y un recuerdo de pan tostado. Fresco, con buena acidez.', true, false],
  ['vin_bruma_sauvignon', 'Bruma', 'blanco', 'Sauvignon Blanc', 2024, 'lin_bruma', 68000, '12,5 %', '#9fc2a3', 'Ceviche, ensaladas, mariscos.', 'Maracuyá, hierba recién cortada y lima. Muy vivo y refrescante.', false, false],
  ['vin_bruma_rosado', 'Bruma Rosé', 'rosado', 'Garnacha', 2024, 'lin_bruma', 72000, '12,0 %', '#f2b8b0', 'Tapas, sushi, tardes de sol.', 'Fresa, sandía y pétalos. Seco, ligero y muy fácil de tomar.', false, false],
  ['vin_bruma_brut', 'Bruma Brut', 'espumoso', 'Chardonnay y Pinot Noir', 2022, 'lin_bruma', 115000, '12,0 %', '#c9a54a', 'Aperitivos, ostras, celebraciones.', 'Burbuja fina, notas de brioche y limón confitado. Método tradicional, 24 meses sobre lías.', true, true],
];

const sql = postgres(url, { max: 1, onnotice: () => {} });
try {
  await sql.begin(async (tx) => {
    await tx`delete from cms.sites where id = ${SITE}`;
    await tx`insert into cms.sites (id, name, public_url) values (${SITE}, 'Viña Sotará (prueba)', 'https://vinos-sotara.desprotz01.workers.dev')`;
    await tx`insert into cms.site_state (site_id, pending, next_build_at) values (${SITE}, 1, now())`;
    for (const [i, t] of types.entries()) {
      await tx`insert into cms.content_types (site_id, id, name, plural, color, title_field, fields, created_at)
        values (${SITE}, ${t.id}, ${t.name}, ${t.plural}, ${t.color}, ${t.titleField}, ${tx.json(t.fields)}, now() + make_interval(secs => ${i / 1000}))`;
    }
    const put = async (id, type, data) => {
      await tx`insert into cms.documents (site_id, id, type_id, published, published_at) values (${SITE}, ${id}, ${type}, ${tx.json(data)}, now())`;
      await tx`insert into cms.revisions (site_id, document_id, rev, action, data) values (${SITE}, ${id}, 1, 'publish', ${tx.json(data)})`;
    };
    await put('portada_1', 'portada', {
      titulo: 'Vinos de altura, hechos sin prisa',
      subtitulo: 'Desde 1998 cultivamos 40 hectáreas entre la niebla del valle de Sotará. Ocho vinos, una sola manera de hacerlos: a mano y con tiempo.',
      aviso: 'Bodega ficticia de prueba · Venta solo a mayores de 18 años · El exceso de alcohol es perjudicial para la salud',
      historia: '<p>Viña Sotará nació cuando tres familias del valle decidieron replantar las laderas que sus abuelos usaban para el café. La altura, las noches frías y la bruma de la mañana hacen vinos frescos, de acidez viva y aromas limpios.</p><p>Todo lo que ves aquí es un ejemplo: la bodega, los vinos y los precios son ficticios.</p>',
    });
    for (const [id, nombre, descripcion] of lineas) await put(id, 'linea', { nombre, descripcion });
    for (const [id, nombre, tipo, cepa, cosecha, linea, precio, alcohol, etiqueta, maridaje, notas, destacado, agotado] of vinos) {
      await put(id, 'vino', { nombre, tipo, cepa, cosecha, linea, precio, alcohol, region: 'Valle de Sotará', etiqueta, maridaje, notas: `<p>${notas}</p>`, destacado, agotado });
    }
  });
  console.log(`Sitio «${SITE}» creado con ${vinos.length} vinos y ${lineas.length} líneas.`);
} finally { await sql.end(); }
