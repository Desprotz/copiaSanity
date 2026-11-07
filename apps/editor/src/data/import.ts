// Importación de entidades y datos desde otros CMS (pensado para Strapi v4/v5) o desde CSV.
// Todo ocurre en el navegador: se leen los archivos, se proponen tipos y campos, la persona los ajusta
// y al final se envía un lote al almacén (store.importContent) que lo guarda en una sola transacción.

import { newId, slugKey } from './domain';
import type { ContentType, DocData, FieldKind, ImportBatch, LineColor } from './types';

/** Una columna detectada en el origen y cómo se va a guardar. */
export interface ImportColumn {
  /** Nombre en el origen (p. ej. «publishedDate» o «seo.metaTitle»). */
  source: string;
  include: boolean;
  /** Clave del campo destino (a-z0-9_). */
  key: string;
  label: string;
  kind: FieldKind;
  required: boolean;
  /** Para relaciones: entidad de este mismo lote a la que apunta. */
  refEntity?: string;
  /** El campo ya existe en el tipo destino: su clase no se puede cambiar. */
  existing?: boolean;
  sample: string;
}

/** Una colección del origen (artículos, autores…) que se convertirá en un tipo de contenido. */
export interface ImportEntity {
  /** Identificador estable dentro del lote (nombre normalizado). */
  id: string;
  file: string;
  name: string;
  plural: string;
  /** 'new' crea un tipo; cualquier otro valor es el id de un tipo existente del sitio. */
  target: string;
  records: { sourceId?: string; values: Record<string, unknown> }[];
  columns: ImportColumn[];
  warnings: string[];
}

export interface ParsedFile { file: string; entities: ImportEntity[]; schemas: StrapiSchema[]; error?: string }

// ---------------------------------------------------------------- CSV

/** CSV según RFC 4180 (comillas, comillas dobles, saltos de línea dentro de comillas). Detecta «,» o «;» (Excel en español). */
export function parseCsv(text: string): Record<string, string>[] {
  const src = text.replace(/^﻿/, '');
  const firstLine = src.slice(0, src.search(/\r?\n|$/));
  const delim = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ';' : (firstLine.includes('\t') && !firstLine.includes(',') ? '\t' : ',');
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"') { if (src[i + 1] === '"') { cell += '"'; i++; } else quoted = false; }
      else cell += ch;
    } else if (ch === '"' && cell === '') quoted = true;
    else if (ch === delim) { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += ch;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  const nonEmpty = rows.filter((r) => r.some((c) => c.trim() !== ''));
  if (!nonEmpty.length) return [];
  const header = nonEmpty[0].map((h, i) => h.trim() || `columna_${i + 1}`);
  return nonEmpty.slice(1).map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ''])));
}

// ---------------------------------------------------------------- Strapi

/** schema.json de un tipo de Strapi (src/api/<x>/content-types/<x>/schema.json). */
export interface StrapiSchema {
  kind?: string;
  info: { singularName?: string; pluralName?: string; displayName?: string };
  attributes: Record<string, { type: string; required?: boolean; target?: string; relation?: string; multiple?: boolean }>;
}

const SYSTEM_KEYS = new Set(['id', 'documentId', 'createdAt', 'updatedAt', 'publishedAt', 'createdBy', 'updatedBy', 'locale', 'localizations']);

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

function isStrapiSchema(v: unknown): v is StrapiSchema {
  return isObj(v) && isObj(v.attributes) && isObj(v.info);
}

/** Strapi v4 envuelve cada fila en { id, attributes }; v5 la entrega plana con documentId. */
function unwrapRecord(r: unknown): { sourceId?: string; values: Record<string, unknown> } | null {
  if (!isObj(r)) return null;
  const values = isObj(r.attributes) ? { ...r.attributes } : { ...r };
  const sourceId = r.documentId ?? r.id ?? values.documentId ?? values.id;
  return { sourceId: sourceId === undefined || sourceId === null ? undefined : String(sourceId), values };
}

/** Relación de Strapi en cualquiera de sus formas → lista de ids del origen. */
function relationIds(v: unknown): string[] | null {
  const one = (x: unknown): string | null => {
    if (!isObj(x)) return null;
    const id = x.documentId ?? x.id ?? (isObj(x.attributes) ? x.attributes.documentId : undefined);
    return id === undefined || id === null ? null : String(id);
  };
  if (isObj(v) && 'data' in v) {
    const d = v.data;
    if (d === null) return [];
    if (Array.isArray(d)) return d.map(one).filter((x): x is string => x !== null);
    const x = one(d);
    return x ? [x] : null;
  }
  if (Array.isArray(v) && v.length && v.every((x) => isObj(x) && ('documentId' in x || ('id' in x && Object.keys(x).length > 1 && !('type' in x && 'children' in x))))) {
    return v.map(one).filter((x): x is string => x !== null);
  }
  if (isObj(v) && ('documentId' in v || ('id' in v && ('attributes' in v || 'createdAt' in v)))) {
    const x = one(v);
    return x ? [x] : null;
  }
  return null;
}

/** Medio de Strapi (imagen o archivo) → URL. */
function mediaUrl(v: unknown): string | null {
  const pick = (x: unknown): string | null => {
    if (!isObj(x)) return null;
    const a = isObj(x.attributes) ? x.attributes : x;
    return typeof a.url === 'string' && (typeof a.mime === 'string' || 'formats' in a || 'alternativeText' in a) ? a.url : null;
  };
  if (isObj(v) && 'data' in v) {
    const d = v.data;
    if (Array.isArray(d)) { const urls = d.map(pick).filter(Boolean); return urls.length ? urls.join(', ') : null; }
    return pick(d);
  }
  if (Array.isArray(v)) { const urls = v.map(pick); return urls.length && urls.every(Boolean) ? urls.join(', ') : null; }
  return pick(v);
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

/** Bloques de texto de Strapi v5 («blocks») → HTML con las etiquetas que entiende el editor. */
function isBlocks(v: unknown): v is Record<string, unknown>[] {
  return Array.isArray(v) && v.length > 0 && v.every((b) => isObj(b) && typeof b.type === 'string' && Array.isArray(b.children));
}
function blocksToHtml(blocks: unknown[]): string {
  const inline = (nodes: unknown): string => (Array.isArray(nodes) ? nodes : []).map((n) => {
    if (!isObj(n)) return '';
    if (n.type === 'link') return inline(n.children);
    let t = esc(String(n.text ?? ''));
    if (n.bold) t = `<strong>${t}</strong>`;
    if (n.italic) t = `<em>${t}</em>`;
    return t;
  }).join('');
  return blocks.map((b) => {
    if (!isObj(b)) return '';
    if (b.type === 'list') {
      const tag = b.format === 'ordered' ? 'ol' : 'ul';
      return `<${tag}>${(b.children as unknown[]).map((li) => `<li>${inline(isObj(li) ? li.children : [])}</li>`).join('')}</${tag}>`;
    }
    if (b.type === 'heading') return `<p><strong>${inline(b.children)}</strong></p>`;
    return `<p>${inline(b.children)}</p>`;
  }).join('');
}

// ---------------------------------------------------------------- Lectura de archivos

const baseName = (file: string) => file.replace(/\.[^.]+$/, '').replace(/[-_.]?(export|data|schema)$/i, '') || file;

function humanize(key: string): string {
  const s = key.replace(/[._-]+/g, ' ').replace(/([a-z0-9])([A-Z])/g, '$1 $2').trim();
  return s ? s[0].toUpperCase() + s.slice(1).toLowerCase() : key;
}
function singular(plural: string): string {
  if (/ies$/i.test(plural)) return plural.slice(0, -3) + 'y';
  if (/(ses|xes|zes|ches|shes)$/i.test(plural)) return plural.slice(0, -2);
  if (/s$/i.test(plural) && !/ss$/i.test(plural)) return plural.slice(0, -1);
  return plural;
}

/** Aplana objetos anidados (componentes de Strapi) un nivel: seo.metaTitle. */
function flatten(values: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(values)) {
    if (SYSTEM_KEYS.has(k)) continue;
    if (isObj(v) && relationIds(v) === null && mediaUrl(v) === null && !('data' in v)) {
      for (const [k2, v2] of Object.entries(v)) if (k2 !== 'id' && k2 !== '__component') out[`${k}.${k2}`] = v2;
    } else out[k] = v;
  }
  return out;
}

/** Lee un archivo .json o .csv y devuelve las colecciones y esquemas que contiene. */
export function parseFile(file: string, text: string): ParsedFile {
  const lower = file.toLowerCase();
  try {
    if (lower.endsWith('.csv') || lower.endsWith('.tsv')) {
      const rows = parseCsv(text);
      if (!rows.length) return { file, entities: [], schemas: [], error: 'El CSV no tiene filas de datos (la primera fila debe ser la cabecera).' };
      return { file, entities: [entityFrom(file, baseName(file), rows.map((r) => ({ sourceId: r.id || r.documentId || undefined, values: r })), true)], schemas: [] };
    }
    const json: unknown = JSON.parse(text.replace(/^﻿/, ''));
    return { file, ...fromJson(file, json) };
  } catch (e) {
    return { file, entities: [], schemas: [], error: e instanceof SyntaxError ? `No es un JSON válido: ${e.message}` : (e as Error).message };
  }
}

function fromJson(file: string, json: unknown): { entities: ImportEntity[]; schemas: StrapiSchema[] } {
  // schema.json suelto o lista de esquemas
  if (isStrapiSchema(json)) return { entities: [], schemas: [json] };
  if (Array.isArray(json) && json.length && json.every(isStrapiSchema)) return { entities: [], schemas: json as StrapiSchema[] };

  const toEntity = (name: string, list: unknown[]) => {
    const records = list.map(unwrapRecord).filter((r): r is NonNullable<typeof r> => r !== null);
    return records.length ? entityFrom(file, name, records, false) : null;
  };

  // Respuesta REST de Strapi: { data: [...] , meta } o { data: {...} } (single type)
  if (isObj(json) && 'data' in json) {
    const d = json.data;
    const e = toEntity(baseName(file), Array.isArray(d) ? d : [d]);
    return { entities: e ? [e] : [], schemas: [] };
  }
  // Lista simple de objetos
  if (Array.isArray(json)) {
    const e = toEntity(baseName(file), json);
    return { entities: e ? [e] : [], schemas: [] };
  }
  // Varias colecciones en un archivo: { "articles": [...], "authors": { data: [...] } }
  if (isObj(json)) {
    const entities: ImportEntity[] = [];
    const schemas: StrapiSchema[] = [];
    for (const [k, v] of Object.entries(json)) {
      if (isStrapiSchema(v)) { schemas.push(v); continue; }
      const list = Array.isArray(v) ? v : isObj(v) && Array.isArray(v.data) ? v.data : null;
      if (list && list.some(isObj)) { const e = toEntity(k, list); if (e) entities.push(e); }
    }
    if (entities.length || schemas.length) return { entities, schemas };
    // Un único objeto: se importa como un documento
    const e = toEntity(baseName(file), [json]);
    return { entities: e ? [e] : [], schemas: [] };
  }
  throw new Error('No se encontraron registros. Usa una lista de objetos, una respuesta de la API de Strapi ({ "data": [...] }) o un CSV.');
}

// ---------------------------------------------------------------- Inferencia de campos

const TITLE_HINTS = ['title', 'titulo', 'título', 'name', 'nombre', 'heading', 'label', 'slug'];
const BOOL_WORDS = new Set(['true', 'false', 'si', 'sí', 'no', 'yes']);

/** Lista de valores simples (etiquetas, opciones): se guarda como texto separado por comas. */
const isPrimList = (v: unknown): v is unknown[] => Array.isArray(v) && v.every((x) => typeof x !== 'object' || x === null);

function inferKind(values: unknown[], fromCsv: boolean): FieldKind {
  const vs = values.filter((v) => v !== null && v !== undefined && v !== '');
  if (!vs.length) return 'string';
  if (vs.every((v) => typeof v === 'boolean' || (fromCsv && typeof v === 'string' && BOOL_WORDS.has(v.trim().toLowerCase())))) return 'boolean';
  if (vs.every((v) => typeof v === 'number' || (fromCsv && typeof v === 'string' && toNumber(v) !== null))) return 'number';
  if (vs.some(isBlocks)) return 'richtext';
  const strs = vs.map((v) => (typeof v === 'string' ? v : isPrimList(v) ? v.join(', ') : JSON.stringify(v)));
  if (strs.some((s) => /<(p|br|strong|em|ul|ol|li|h[1-6]|div)\b[^>]*>/i.test(s))) return 'richtext';
  if (strs.some((s) => s.length > 120 || s.includes('\n')) || vs.some((v) => typeof v === 'object' && !isPrimList(v))) return 'text';
  return 'string';
}

function sampleOf(values: unknown[]): string {
  const v = values.find((x) => x !== null && x !== undefined && x !== '');
  if (v === undefined) return '';
  const s = isBlocks(v) ? blocksToHtml(v).replace(/<[^>]+>/g, ' ') : typeof v === 'string' ? v : JSON.stringify(v);
  return s.replace(/\s+/g, ' ').trim().slice(0, 60);
}

function uniqueKey(base: string, used: Set<string>): string {
  let key = (slugKey(base) || 'campo').slice(0, 64);
  if (/^[0-9]/.test(key)) key = `c_${key}`.slice(0, 64);
  let k = key; let n = 2;
  while (used.has(k)) k = `${key.slice(0, 60)}_${n++}`;
  used.add(k);
  return k;
}

function entityFrom(file: string, rawName: string, records: { sourceId?: string; values: Record<string, unknown> }[], fromCsv: boolean): ImportEntity {
  const flat = records.map((r) => ({ sourceId: r.sourceId, values: flatten(r.values) }));
  const all: string[] = [];
  for (const r of flat) for (const k of Object.keys(r.values)) if (!all.includes(k)) all.push(k);
  // Un componente vacío en algunos registros (seo: null) no es una columna propia si otros registros lo aplanaron (seo.metaTitle).
  const sources = all.filter((k) => !(all.some((o) => o.startsWith(`${k}.`)) && flat.every((r) => isEmptyValue(r.values[k]))));
  const used = new Set<string>();
  const warnings: string[] = [];
  const columns: ImportColumn[] = sources.map((source) => {
    const values = flat.map((r) => r.values[source]);
    // Solo es relación si algún registro enlaza a algo ({ data: null } en todos no dice si era relación o imagen).
    const isRelation = !fromCsv && values.some((v) => v !== null && v !== undefined && (relationIds(v)?.length ?? 0) > 0 && mediaUrl(v) === null);
    const isMedia = !fromCsv && values.some((v) => v !== null && v !== undefined && mediaUrl(v) !== null);
    const kind: FieldKind = isRelation ? 'reference' : isMedia ? 'string' : inferKind(values, fromCsv);
    return {
      source, include: true, key: uniqueKey(source, used), label: humanize(source).slice(0, 80), kind, required: false,
      sample: isMedia ? (mediaUrl(values.find((v) => mediaUrl(v)))?.slice(0, 60) ?? '') : isRelation ? `${(relationIds(values.find((v) => relationIds(v)?.length)) ?? []).length} enlace(s)` : sampleOf(values),
    };
  });
  const plural = humanize(rawName);
  const name = humanize(singular(rawName));
  const e: ImportEntity = { id: slugKey(rawName) || 'coleccion', file, name, plural, target: 'new', records: flat, columns, warnings };
  pickTitle(e);
  return e;
}

/** Elige el campo de título: título/nombre si existe, si no el primer texto corto. Es obligatorio. */
function pickTitle(e: ImportEntity) {
  e.columns.forEach((c) => { if (!c.existing) c.required = false; });
  const title = e.columns.find((c) => c.include && c.kind === 'string' && TITLE_HINTS.includes(c.source.toLowerCase()))
    ?? e.columns.find((c) => c.include && c.kind === 'string');
  if (title && !title.existing) title.required = e.records.every((r) => !isEmptyValue(r.values[title.source]));
}

export function titleColumn(e: ImportEntity): ImportColumn | undefined {
  return e.columns.find((c) => c.include && c.kind === 'string' && TITLE_HINTS.includes(c.source.toLowerCase()))
    ?? e.columns.find((c) => c.include && c.kind === 'string')
    ?? e.columns.find((c) => c.include);
}

const isEmptyValue = (v: unknown) => v === null || v === undefined || (typeof v === 'string' && v.trim() === '');

// ---------------------------------------------------------------- Esquemas de Strapi

const STRAPI_KIND: Record<string, FieldKind> = {
  string: 'string', email: 'string', uid: 'string', enumeration: 'string', date: 'string', datetime: 'string', time: 'string', password: 'string',
  text: 'text', richtext: 'text', blocks: 'richtext', json: 'text', component: 'text', dynamiczone: 'text',
  integer: 'number', biginteger: 'number', float: 'number', decimal: 'number',
  boolean: 'boolean', media: 'string', relation: 'reference',
};

const schemaNames = (s: StrapiSchema) => [s.info.pluralName, s.info.singularName, s.info.displayName].filter(Boolean).map((n) => slugKey(n!));

/** Aplica los schema.json de Strapi: clases de campo, obligatorios y nombre visible de cada colección. */
export function applySchemas(entities: ImportEntity[], schemas: StrapiSchema[]): ImportEntity[] {
  for (const s of schemas) {
    const names = schemaNames(s);
    let e = entities.find((x) => names.includes(x.id));
    if (!e) {
      // Esquema sin datos: se crea el tipo vacío para tener la estructura.
      const used = new Set<string>();
      e = {
        id: slugKey(s.info.pluralName ?? s.info.singularName ?? s.info.displayName ?? 'coleccion'), file: 'schema.json',
        name: s.info.displayName ?? humanize(s.info.singularName ?? 'Elemento'), plural: humanize(s.info.pluralName ?? s.info.displayName ?? 'Elementos'),
        target: 'new', records: [], warnings: [],
        columns: Object.keys(s.attributes).filter((k) => !SYSTEM_KEYS.has(k)).map((k) => ({ source: k, include: true, key: uniqueKey(k, used), label: humanize(k), kind: 'string' as FieldKind, required: false, sample: '' })),
      };
      entities.push(e);
    }
    if (s.info.displayName) e.name = s.info.displayName;
    if (s.info.pluralName) e.plural = humanize(s.info.pluralName);
    for (const [k, a] of Object.entries(s.attributes)) {
      const col = e.columns.find((c) => c.source === k);
      if (!col || col.existing) continue;
      col.kind = STRAPI_KIND[a.type] ?? col.kind;
      col.required = Boolean(a.required);
      if (a.type === 'relation' && a.target) {
        // target = "api::author.author" → entidad «authors»/«author»
        const t = a.target.split('.').pop() ?? '';
        const target = entities.find((x) => x.id === slugKey(t) || x.id === slugKey(t + 's') || schemas.some((o) => schemaNames(o).includes(x.id) && schemaNames(o).includes(slugKey(t))));
        if (target) col.refEntity = target.id;
      }
    }
  }
  return entities;
}

/** Une entidades con el mismo nombre (p. ej. varias páginas de la API de Strapi) y resuelve a qué apunta cada relación. */
export function finalizeEntities(entities: ImportEntity[]): ImportEntity[] {
  const out: ImportEntity[] = [];
  for (const e of entities) {
    const same = out.find((o) => o.id === e.id);
    if (!same) { out.push(e); continue; }
    same.records.push(...e.records);
    for (const c of e.columns) if (!same.columns.some((x) => x.source === c.source)) {
      const used = new Set(same.columns.map((x) => x.key));
      same.columns.push({ ...c, key: uniqueKey(c.source, used) });
    }
    if (!same.file.includes(e.file)) same.file += `, ${e.file}`;
  }
  // Relaciones sin destino en el lote: se adivina por los ids del origen.
  for (const e of out) for (const c of e.columns) {
    if (c.kind !== 'reference' || c.refEntity) continue;
    const ids = new Set(e.records.flatMap((r) => relationIds(r.values[c.source]) ?? []));
    const byName = out.find((o) => o.id === slugKey(c.source) || o.id === slugKey(c.source + 's') || slugKey(singular(o.id)) === slugKey(c.source));
    const byIds = out.find((o) => o !== e && ids.size > 0 && [...ids].every((id) => o.records.some((r) => r.sourceId === id)));
    c.refEntity = (byName ?? byIds)?.id;
  }
  for (const e of out) refreshWarnings(e);
  return out;
}

export function refreshWarnings(e: ImportEntity) {
  const w: string[] = [];
  const lostRel = e.columns.filter((c) => c.include && c.kind === 'reference' && !c.refEntity);
  if (lostRel.length) w.push(`No se sabe a qué colección apuntan ${lostRel.map((c) => `«${c.label}»`).join(', ')}. Importa también esa colección o desmarca el campo.`);
  const multi = e.columns.filter((c) => c.include && c.kind === 'reference' && e.records.some((r) => (relationIds(r.values[c.source])?.length ?? 0) > 1));
  if (multi.length) w.push(`${multi.map((c) => `«${c.label}»`).join(', ')} tiene varios enlaces por registro; el CMS guarda uno, así que se conserva el primero.`);
  const media = e.columns.filter((c) => c.include && e.records.some((r) => mediaUrl(r.values[c.source]) !== null));
  if (media.length) w.push(`Las imágenes (${media.map((c) => `«${c.label}»`).join(', ')}) se guardan como dirección (URL). Para tenerlas como foto del CMS, súbelas después en cada documento.`);
  if (e.columns.filter((c) => c.include).length > 60) w.push('Un tipo admite como máximo 60 campos: desmarca los que no necesites.');
  e.warnings = w;
}

/**
 * Cambia el destino de una colección: un tipo nuevo o uno existente del sitio.
 * En un tipo existente, las columnas que coinciden con un campo usan ese campo; las demás se agregan como campos nuevos.
 */
export function retarget(e: ImportEntity, target: string, types: ContentType[]): ImportEntity {
  const type = types.find((t) => t.id === target);
  const used = new Set(type?.fields.map((f) => f.key) ?? []);
  const columns = e.columns.map((c) => {
    const base: ImportColumn = { ...c, existing: false };
    const match = type?.fields.find((f) => f.key === slugKey(c.source) || f.key === c.key || slugKey(f.label) === slugKey(c.label));
    if (match && !used.has(`__${match.key}`)) {
      used.add(`__${match.key}`);
      return { ...base, key: match.key, label: match.label, kind: match.kind, required: match.required, existing: true };
    }
    if (c.existing || used.has(c.key)) base.key = uniqueKey(c.source, used); else used.add(c.key);
    return base;
  });
  const next = { ...e, target, columns };
  if (!type) pickTitle(next);
  refreshWarnings(next);
  return next;
}

// ---------------------------------------------------------------- Conversión de valores

export function toNumber(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v !== 'string') return null;
  let s = v.trim().replace(/\s/g, '');
  if (!s) return null;
  // 1.234,56 (es) → 1234.56 ; 1,234.56 (en) → 1234.56 ; 3,5 → 3.5
  if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) s = s.replace(/\./g, '').replace(',', '.');
  else if (/^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) s = s.replace(/,/g, '');
  else if (/^-?\d+,\d+$/.test(s)) s = s.replace(',', '.');
  if (!/^-?\d+(\.\d+)?([eE][-+]?\d+)?$/.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function toText(v: unknown): string {
  if (typeof v === 'string') return v;
  const url = mediaUrl(v);
  if (url) return url;
  if (Array.isArray(v) && v.every((x) => typeof x !== 'object' || x === null)) return v.filter((x) => x !== null).join(', ');
  return JSON.stringify(v);
}

function convert(v: unknown, kind: FieldKind): unknown {
  if (v === null || v === undefined || v === '' || (Array.isArray(v) && !v.length)) return undefined;
  // Relación o medio vacío de Strapi: { data: null } o { data: [] }
  if (isObj(v) && 'data' in v && (v.data === null || (Array.isArray(v.data) && !v.data.length))) return undefined;
  switch (kind) {
    case 'number': return toNumber(v) ?? undefined;
    case 'boolean': {
      if (typeof v === 'boolean') return v;
      const s = String(v).trim().toLowerCase();
      return ['true', 'si', 'sí', 'yes', '1'].includes(s) ? true : ['false', 'no', '0'].includes(s) ? false : undefined;
    }
    case 'richtext': {
      if (isBlocks(v)) return blocksToHtml(v);
      const s = toText(v);
      if (/<[a-z][^>]*>/i.test(s)) return s;
      return s.split(/\n{2,}/).map((p) => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`).join('');
    }
    case 'string': return toText(v).replace(/\s+/g, ' ').trim() || undefined;
    case 'text': return isBlocks(v) ? blocksToHtml(v).replace(/<\/p>/g, '\n\n').replace(/<[^>]+>/g, '').trim() : toText(v);
    default: return undefined;
  }
}

// ---------------------------------------------------------------- Plan de importación

const COLORS: LineColor[] = ['violet', 'green', 'amber', 'red', 'blue'];

export interface ImportPlan { types: ContentType[]; documents: ImportBatch['documents'] }

/**
 * Convierte lo que la persona revisó en tipos y documentos listos para guardar.
 * Los ids de los documentos se generan aquí para poder enlazar relaciones entre colecciones del mismo lote.
 */
export function buildPlan(entities: ImportEntity[], existing: ContentType[], publish: boolean): ImportPlan {
  const typeIdOf = new Map<string, string>();
  const takenTypeIds = new Set(existing.map((t) => t.id));
  for (const e of entities) {
    if (e.target !== 'new') { typeIdOf.set(e.id, e.target); continue; }
    let id = slugKey(e.name).slice(0, 60) || 'tipo';
    if (takenTypeIds.has(id)) id = newId(id.slice(0, 50));
    takenTypeIds.add(id);
    typeIdOf.set(e.id, id);
  }

  // id del origen → id nuevo, por entidad
  const docIds = new Map<string, Map<string, string>>();
  for (const e of entities) {
    const tid = typeIdOf.get(e.id)!;
    const m = new Map<string, string>();
    e.records.forEach((r, i) => m.set(r.sourceId ?? `#${i}`, newId(tid)));
    docIds.set(e.id, m);
  }

  const types: ContentType[] = [];
  const documents: ImportBatch['documents'] = [];
  entities.forEach((e, i) => {
    const typeId = typeIdOf.get(e.id)!;
    const cols = e.columns.filter((c) => c.include && (c.kind !== 'reference' || (c.refEntity && typeIdOf.has(c.refEntity))));
    const base = existing.find((t) => t.id === typeId);
    const newFields = cols.filter((c) => !base?.fields.some((f) => f.key === c.key)).map((c) => ({
      key: c.key, label: c.label.trim() || humanize(c.source), kind: c.kind, required: c.required,
      ...(c.kind === 'reference' ? { refType: typeIdOf.get(c.refEntity!) } : {}),
    }));
    const fields = [...(base?.fields ?? []), ...newFields];
    if (!fields.length) return;
    const title = titleColumn(e);
    const titleField = base?.titleField ?? (title && cols.includes(title) ? title.key : fields.find((f) => f.kind === 'string')?.key ?? fields[0].key);
    if (!base || newFields.length) {
      types.push({
        id: typeId, version: base?.version ?? 0, fields, titleField,
        name: (base?.name ?? e.name.trim()) || 'Elemento', plural: (base?.plural ?? e.plural.trim()) || 'Elementos',
        color: base?.color ?? COLORS[i % COLORS.length],
      });
    }
    const ids = docIds.get(e.id)!;
    e.records.forEach((r, j) => {
      const data: DocData = {};
      for (const c of cols) {
        const raw = r.values[c.source];
        if (c.kind === 'reference') {
          const first = (relationIds(raw) ?? (typeof raw === 'string' || typeof raw === 'number' ? [String(raw)] : []))[0];
          const target = first !== undefined ? docIds.get(c.refEntity!)?.get(first) : undefined;
          if (target) data[c.key] = target;
          continue;
        }
        const v = convert(raw, c.kind);
        if (v !== undefined) data[c.key] = v;
      }
      documents.push({ id: ids.get(r.sourceId ?? `#${j}`)!, typeId, data, publish });
    });
  });
  return { types, documents };
}

/** Parte el lote en envíos que caben en una solicitud (máx. 100 documentos y ~700 KB). */
export function chunkPlan(plan: ImportPlan): ImportBatch[] {
  const batches: ImportBatch[] = [];
  let cur: ImportBatch = { types: plan.types, documents: [] };
  let size = JSON.stringify(plan.types).length;
  for (const d of plan.documents) {
    const s = JSON.stringify(d).length;
    if (cur.documents.length && (cur.documents.length >= 100 || size + s > 700_000)) {
      batches.push(cur);
      cur = { types: [], documents: [] }; size = 0;
    }
    cur.documents.push(d); size += s;
  }
  if (cur.types.length || cur.documents.length) batches.push(cur);
  return batches;
}
