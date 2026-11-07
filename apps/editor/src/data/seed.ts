import type { CmsDocument, ContentType, DocData } from './types';

// Portal de prueba con datos ficticios (replica/demo-plan.md). Nada proviene de Sanity ni de personas reales.

export const SEED_TYPES: ContentType[] = [
  {
    id: 'propiedad', name: 'Propiedad', plural: 'Propiedades', color: 'red', titleField: 'titulo', version: 1,
    fields: [
      { key: 'titulo', label: 'Título', kind: 'string', required: true },
      { key: 'precio', label: 'Precio', kind: 'number', required: true, min: 1, unit: 'COP', help: 'Sin decimales.' },
      { key: 'habitaciones', label: 'Habitaciones', kind: 'number', required: true, min: 1, max: 20 },
      { key: 'barrio', label: 'Barrio', kind: 'string', required: false },
      { key: 'en_venta', label: 'En venta (si no, en arriendo)', kind: 'boolean', required: false },
      { key: 'foto', label: 'Foto principal', kind: 'image', required: false, help: 'JPG, PNG o WebP de hasta 20 MB. La optimizamos antes de guardarla.' },
      { key: 'agente', label: 'Agente', kind: 'reference', required: false, refType: 'agente' },
      { key: 'descripcion', label: 'Descripción', kind: 'richtext', required: false },
    ],
  },
  {
    id: 'articulo', name: 'Artículo', plural: 'Artículos', color: 'blue', titleField: 'titulo', version: 1,
    fields: [
      { key: 'titulo', label: 'Título', kind: 'string', required: true },
      { key: 'resumen', label: 'Resumen', kind: 'text', required: true, help: 'Una o dos frases para la lista de artículos.' },
      { key: 'autor', label: 'Autor', kind: 'reference', required: false, refType: 'agente' },
      { key: 'cuerpo', label: 'Texto', kind: 'richtext', required: false },
    ],
  },
  {
    id: 'agente', name: 'Agente', plural: 'Agentes', color: 'green', titleField: 'nombre', version: 1,
    fields: [
      { key: 'nombre', label: 'Nombre', kind: 'string', required: true },
      { key: 'telefono', label: 'Teléfono', kind: 'string', required: false, help: 'Número ficticio.' },
    ],
  },
  {
    id: 'categoria', name: 'Categoría', plural: 'Categorías', color: 'amber', titleField: 'nombre', version: 1,
    fields: [{ key: 'nombre', label: 'Nombre', kind: 'string', required: true }],
  },
];

const AGENTS = ['Laura Pinzón (ficticia)', 'Andrés Vélez (ficticio)', 'Marta Ríos (ficticia)'];

const PROPERTIES: [string, number, number, string][] = [
  ['Casa con patio en Barrio Ficticio', 420_000_000, 0, 'Barrio Ficticio'],
  ['Apartamento cerca del parque', 310_000_000, 2, 'El Parque'],
  ['Local comercial esquinero', 520_000_000, 1, 'Centro'],
  ['Lote campestre con vista', 260_000_000, 1, 'Vereda La Loma'],
  ['Oficina en el centro histórico', 380_000_000, 1, 'Centro histórico'],
  ['Casa esquinera de dos pisos', 450_000_000, 4, 'San Ficticio'],
  ['Apartaestudio luminoso', 190_000_000, 1, 'Los Pinos'],
  ['Bodega con acceso de camiones', 900_000_000, 1, 'Zona industrial'],
  ['Penthouse con terraza', 1_200_000_000, 3, 'Alto Mirador'],
  ['Casa de campo con huerta', 610_000_000, 5, 'Vereda El Roble'],
  ['Apartamento para estrenar', 340_000_000, 3, 'Nuevo Horizonte'],
  ['Habitación amoblada', 1_200_000, 1, 'Universidad'],
];

const ARTICLES = [
  ['Cómo leer un avalúo sin perderse', 'Las partes de un avalúo explicadas con un ejemplo ficticio.'],
  ['Cinco preguntas antes de arrendar', 'Lo que conviene preguntar antes de firmar un contrato.'],
  ['Qué mirar en una visita', 'Una lista corta para recorrer una propiedad con calma.'],
];

const CATEGORIES = ['Compra', 'Arriendo', 'Inversión'];

function iso(daysAgo: number, hour = 10): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

function doc(id: string, typeId: string, data: DocData, opts: { daysAgo: number; published?: boolean; draft?: DocData | null }): CmsDocument {
  const at = iso(opts.daysAgo);
  return {
    id, typeId, rev: 1, createdAt: at, updatedAt: at,
    published: opts.published ? data : null,
    draft: opts.published ? (opts.draft ?? null) : data,
    publishedAt: opts.published ? at : null,
  };
}

export function seedDocuments(): CmsDocument[] {
  const docs: CmsDocument[] = [];
  AGENTS.forEach((nombre, i) => docs.push(doc(`agente_${i + 1}`, 'agente', { nombre, telefono: `300 000 00${i}${i}` }, { daysAgo: 20, published: true })));
  PROPERTIES.forEach(([titulo, precio, habitaciones, barrio], i) => {
    const data: DocData = {
      titulo, precio, habitaciones: habitaciones || undefined, barrio, en_venta: i % 3 !== 1,
      agente: `agente_${(i % 3) + 1}`,
      descripcion: `<p>${titulo}. Texto de ejemplo escrito para el portal de prueba; los datos son ficticios.</p>`,
    };
    if (i === 0) {
      // El caso que muestra la firma: publicado antes, con cambios sin publicar y un campo obligatorio vacío.
      docs.push(doc('propiedad_1', 'propiedad', { ...data, habitaciones: 3 }, { daysAgo: 10, published: true, draft: data }));
    } else if (i === 2) {
      docs.push(doc(`propiedad_${i + 1}`, 'propiedad', data, { daysAgo: 5 }));
    } else {
      docs.push(doc(`propiedad_${i + 1}`, 'propiedad', data, { daysAgo: i + 1, published: true }));
    }
  });
  ARTICLES.forEach(([titulo, resumen], i) => docs.push(doc(`articulo_${i + 1}`, 'articulo', { titulo, resumen, autor: `agente_${i + 1}`, cuerpo: `<p>${resumen}</p>` }, { daysAgo: 3 + i, published: i !== 2 })));
  CATEGORIES.forEach((nombre, i) => docs.push(doc(`categoria_${i + 1}`, 'categoria', { nombre }, { daysAgo: 30, published: true })));
  return docs;
}

// Segundo sitio ficticio, para comprobar que los sitios no se mezclan.
export const PORTFOLIO_TYPES: ContentType[] = [
  {
    id: 'proyecto', name: 'Proyecto', plural: 'Proyectos', color: 'violet', titleField: 'titulo', version: 1,
    fields: [
      { key: 'titulo', label: 'Título', kind: 'string', required: true },
      { key: 'anio', label: 'Año', kind: 'number', required: true, min: 2000, max: 2100 },
      { key: 'cliente', label: 'Cliente (ficticio)', kind: 'string', required: false },
      { key: 'portada', label: 'Portada', kind: 'image', required: false },
      { key: 'descripcion', label: 'Descripción', kind: 'richtext', required: false },
    ],
  },
  {
    id: 'pagina', name: 'Página', plural: 'Páginas', color: 'blue', titleField: 'titulo', version: 1,
    fields: [
      { key: 'titulo', label: 'Título', kind: 'string', required: true },
      { key: 'cuerpo', label: 'Texto', kind: 'richtext', required: false },
    ],
  },
];

export function portfolioDocuments(): CmsDocument[] {
  const projects: [string, number, string][] = [
    ['Identidad para una panadería de barrio', 2025, 'Panadería El Trigo (ficticia)'],
    ['Sitio web de un estudio de yoga', 2026, 'Estudio Calma (ficticio)'],
    ['Catálogo de muebles en madera', 2026, ''],
  ];
  const docs = projects.map(([titulo, anio, cliente], i) => doc(`proyecto_${i + 1}`, 'proyecto', { titulo, anio, cliente, descripcion: `<p>${titulo}. Proyecto de ejemplo, datos ficticios.</p>` }, { daysAgo: 6 + i, published: i < 2 }));
  docs.push(doc('pagina_1', 'pagina', { titulo: 'Sobre mí', cuerpo: '<p>Página de ejemplo del portafolio de prueba.</p>' }, { daysAgo: 12, published: true }));
  return docs;
}

export interface SeedSite { id: string; name: string; types: ContentType[]; documents: () => CmsDocument[] }
export const SEED_SITES: SeedSite[] = [
  { id: 'portal-prueba', name: 'Portal inmobiliario (prueba)', types: SEED_TYPES, documents: seedDocuments },
  { id: 'portafolio-prueba', name: 'Portafolio (prueba)', types: PORTFOLIO_TYPES, documents: portfolioDocuments },
];
