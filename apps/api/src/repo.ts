import type postgres from 'postgres';
// Dominio compartido con el editor: la misma validación corre en el navegador y aquí (la de aquí es la que manda).
import { newId, validate } from '../../editor/src/data/domain';
import { SEED_SITES } from '../../editor/src/data/seed';
import type { Asset, CmsDocument, ContentType, DocData, ImportBatch, ImportResult, Site, SiteSnapshot, SiteStatus } from '../../editor/src/data/types';

type Sql = postgres.Sql;
type TransactionSql = postgres.TransactionSql;

export class HttpError extends Error {
  constructor(public status: number, message: string, public body?: Record<string, unknown>) { super(message); }
}

type Db = Sql | TransactionSql;
type Row = Record<string, unknown>;
/** Toda operación recibe el sitio: ninguna consulta toca filas de otro sitio (todas las claves incluyen site_id). */
export interface Ctx { site: string; actor: string; batchSeconds: number }

const iso = (v: unknown): string | null => (v instanceof Date ? v.toISOString() : typeof v === 'string' ? new Date(v).toISOString() : null);

const toDoc = (r: Row): CmsDocument => ({
  id: r.id as string, typeId: r.type_id as string,
  draft: (r.draft as DocData | null) ?? null, published: (r.published as DocData | null) ?? null,
  rev: r.rev as number, createdAt: iso(r.created_at)!, updatedAt: iso(r.updated_at)!, publishedAt: iso(r.published_at),
});
const toType = (r: Row): ContentType => ({ id: r.id as string, name: r.name as string, plural: r.plural as string, color: r.color as ContentType['color'], titleField: r.title_field as string, fields: r.fields as ContentType['fields'], version: r.version as number });
const toSite = (r: Row): Site => ({ id: r.id as string, name: r.name as string, createdAt: iso(r.created_at)!, publicUrl: (r.public_url as string | null) ?? null });

const audit = (db: Db, c: Ctx, action: string, target?: string, detail?: unknown) =>
  db`insert into cms.audit_events (site_id, actor, action, target, detail) values (${c.site}, ${c.actor}, ${action}, ${target ?? null}, ${detail === undefined ? null : db.json(detail as never)})`;
const bump = (db: Db, c: Ctx) => db`update cms.site_state set change_seq = change_seq + 1 where site_id = ${c.site}`;
const markForBuild = (db: Db, c: Ctx) =>
  db`update cms.site_state set pending = pending + 1, next_build_at = now() + make_interval(secs => ${c.batchSeconds}) where site_id = ${c.site}`;

async function lockDoc(db: Db, c: Ctx, id: string): Promise<CmsDocument> {
  const [r] = await db`select * from cms.documents where site_id = ${c.site} and id = ${id} for update`;
  if (!r) throw new HttpError(404, 'El documento no existe.');
  return toDoc(r);
}
function assertRev(doc: CmsDocument, expected: number) {
  if (doc.rev !== expected) throw new HttpError(409, 'El documento cambió en otra pestaña o equipo.', { current: doc });
}

// ---------- Sitios ----------

export async function listSites(sql: Sql) { return (await sql`select * from cms.sites order by created_at, id`).map(toSite); }

export async function siteExists(sql: Sql, id: string) { const [r] = await sql`select 1 from cms.sites where id = ${id}`; return Boolean(r); }

/** Crea un sitio vacío con un tipo «Página» para empezar. */
export async function createSite(sql: Sql, id: string, name: string, actor: string, publicUrl: string | null = null) {
  return sql.begin(async (tx) => {
    const [exists] = await tx`select 1 from cms.sites where id = ${id}`;
    if (exists) throw new HttpError(409, 'Ya existe un sitio con esa dirección. Elige otro nombre.');
    const [r] = await tx`insert into cms.sites (id, name, public_url) values (${id}, ${name}, ${publicUrl}) returning *`;
    await tx`insert into cms.site_state (site_id) values (${id})`;
    const fields = [{ key: 'titulo', label: 'Título', kind: 'string', required: true }, { key: 'cuerpo', label: 'Texto', kind: 'richtext', required: false }];
    await tx`insert into cms.content_types (site_id, id, name, plural, color, title_field, fields) values (${id}, 'pagina', 'Página', 'Páginas', 'blue', 'titulo', ${tx.json(fields as never)})`;
    await audit(tx, { site: id, actor, batchSeconds: 0 }, 'site.create', id);
    return toSite(r);
  });
}

/** Borra el sitio y, en cascada, sus tipos, documentos, historial, imágenes y compilaciones. */
export async function updatePublicUrl(sql: Sql, id: string, publicUrl: string | null, actor: string) {
  return sql.begin(async (tx) => {
    const [r] = await tx`update cms.sites set public_url = ${publicUrl} where id = ${id} returning *`;
    if (!r) throw new HttpError(404, 'Ese sitio no existe.');
    await audit(tx, { site: id, actor, batchSeconds: 0 }, 'site.url.update', id);
    return toSite(r);
  });
}

export async function deleteSite(sql: Sql, id: string, actor: string) {
  await sql.begin(async (tx) => {
    const [r] = await tx`delete from cms.sites where id = ${id} returning id`;
    if (!r) throw new HttpError(404, 'Ese sitio no existe.');
    await tx`insert into cms.audit_events (site_id, actor, action, target) values (null, ${actor}, 'site.delete', ${id})`;
  });
}

// ---------- Datos de prueba ----------

async function seedSite(tx: TransactionSql, s: (typeof SEED_SITES)[number], actor: string) {
  await tx`delete from cms.sites where id = ${s.id}`;
  await tx`insert into cms.sites (id, name, created_at) values (${s.id}, ${s.name}, now() + make_interval(secs => ${SEED_SITES.indexOf(s) / 1000}))`;
  await tx`insert into cms.site_state (site_id, last_built_at) values (${s.id}, now() - interval '1 hour')`;
  // created_at escalonado para conservar el orden del menú (todas las filas comparten la misma transacción).
  for (const [i, t] of s.types.entries()) {
    await tx`insert into cms.content_types (site_id, id, name, plural, color, title_field, fields, version, created_at)
      values (${s.id}, ${t.id}, ${t.name}, ${t.plural}, ${t.color}, ${t.titleField}, ${tx.json(t.fields as never)}, ${t.version}, now() + make_interval(secs => ${i / 1000}))`;
  }
  for (const d of s.documents()) {
    await tx`insert into cms.documents (site_id, id, type_id, draft, published, rev, created_at, updated_at, published_at)
      values (${s.id}, ${d.id}, ${d.typeId}, ${d.draft ? tx.json(d.draft as never) : null}, ${d.published ? tx.json(d.published as never) : null}, ${d.rev}, ${d.createdAt}::timestamptz, ${d.updatedAt}::timestamptz, ${d.publishedAt}::timestamptz)`;
    await tx`insert into cms.revisions (site_id, document_id, rev, action, data) values (${s.id}, ${d.id}, ${d.rev}, 'create', ${tx.json((d.draft ?? d.published) as never)})`;
  }
  await writeBuild(tx, s.id, true);
  await audit(tx, { site: s.id, actor, batchSeconds: 0 }, 'demo.reset');
}

export async function ensureSeeded(sql: Sql, actor: string) {
  const [{ n }] = await sql`select count(*)::int as n from cms.sites`;
  if (n > 0) return;
  await sql.begin(async (tx) => {
    await tx`select pg_advisory_xact_lock(4242)`;
    const [{ m }] = await tx`select count(*)::int as m from cms.sites`;
    if (m === 0) for (const s of SEED_SITES) await seedSite(tx, s, actor);
  });
}

/** Restaura solo el sitio indicado si es uno de prueba; nunca toca los demás. */
export async function resetDemo(sql: Sql, c: Ctx) {
  const s = SEED_SITES.find((x) => x.id === c.site);
  if (!s) throw new HttpError(400, 'Solo se pueden restaurar los sitios de prueba.');
  await sql.begin(async (tx) => { await tx`select pg_advisory_xact_lock(4242)`; await seedSite(tx, s, c.actor); });
}

// ---------- Tipos ----------

export async function listTypes(sql: Sql, c: Ctx) {
  return (await sql`select * from cms.content_types where site_id = ${c.site} order by created_at, id`).map(toType);
}

export async function saveType(sql: Sql, c: Ctx, t: ContentType) {
  return sql.begin(async (tx) => {
    for (const f of t.fields) {
      if (f.kind === 'reference' && f.refType && f.refType !== t.id) {
        const [ok] = await tx`select 1 from cms.content_types where site_id = ${c.site} and id = ${f.refType}`;
        if (!ok) throw new HttpError(422, `El campo «${f.label}» enlaza a un tipo que no existe en este sitio.`);
      }
    }
    const [r] = await tx`insert into cms.content_types (site_id, id, name, plural, color, title_field, fields)
      values (${c.site}, ${t.id}, ${t.name}, ${t.plural}, ${t.color}, ${t.titleField}, ${tx.json(t.fields as never)})
      on conflict (site_id, id) do update set name = excluded.name, plural = excluded.plural, color = excluded.color,
        title_field = excluded.title_field, fields = excluded.fields, version = cms.content_types.version + 1, updated_at = now()
      returning *`;
    await bump(tx, c); await audit(tx, c, 'type.save', t.id);
    return toType(r);
  });
}

export async function deleteType(sql: Sql, c: Ctx, id: string) {
  await sql.begin(async (tx) => {
    const [{ n }] = await tx`select count(*)::int as n from cms.documents where site_id = ${c.site} and type_id = ${id}`;
    if (n > 0) throw new HttpError(409, 'Este tipo todavía tiene documentos. Elimínalos primero.');
    await tx`delete from cms.content_types where site_id = ${c.site} and id = ${id}`;
    await bump(tx, c); await audit(tx, c, 'type.delete', id);
  });
}

// ---------- Documentos ----------

export async function listDocuments(sql: Sql, c: Ctx, typeId?: string) {
  const rows = typeId
    ? await sql`select * from cms.documents where site_id = ${c.site} and type_id = ${typeId} order by updated_at desc`
    : await sql`select * from cms.documents where site_id = ${c.site} order by updated_at desc`;
  return rows.map(toDoc);
}

export async function getDocument(sql: Sql, c: Ctx, id: string) {
  const [r] = await sql`select * from cms.documents where site_id = ${c.site} and id = ${id}`;
  return r ? toDoc(r) : undefined;
}

export async function createDocument(sql: Sql, c: Ctx, typeId: string) {
  return sql.begin(async (tx) => {
    const [t] = await tx`select id from cms.content_types where site_id = ${c.site} and id = ${typeId}`;
    if (!t) throw new HttpError(404, 'Ese tipo de contenido no existe en este sitio.');
    const id = newId(typeId);
    const [r] = await tx`insert into cms.documents (site_id, id, type_id, draft) values (${c.site}, ${id}, ${typeId}, ${tx.json({})}) returning *`;
    await tx`insert into cms.revisions (site_id, document_id, rev, action, data) values (${c.site}, ${id}, 1, 'create', ${tx.json({})})`;
    await bump(tx, c); await audit(tx, c, 'doc.create', id);
    return toDoc(r);
  });
}

export async function updateDraft(sql: Sql, c: Ctx, id: string, data: DocData, expectedRev: number) {
  return sql.begin(async (tx) => {
    const doc = await lockDoc(tx, c, id); assertRev(doc, expectedRev);
    // El autoguardado no agrega filas al historial; sí lo hacen publicar, retirar y descartar.
    const [r] = await tx`update cms.documents set draft = ${tx.json(data as never)}, rev = rev + 1, updated_at = now() where site_id = ${c.site} and id = ${id} returning *`;
    await bump(tx, c);
    return toDoc(r);
  });
}

export async function publish(sql: Sql, c: Ctx, id: string, expectedRev: number) {
  return sql.begin(async (tx) => {
    const doc = await lockDoc(tx, c, id); assertRev(doc, expectedRev);
    const [tr] = await tx`select * from cms.content_types where site_id = ${c.site} and id = ${doc.typeId}`;
    const data = doc.draft ?? doc.published;
    if (!tr || !data) throw new HttpError(422, 'No hay nada que publicar.');
    const errors = validate(toType(tr), data);
    if (Object.keys(errors).length) throw new HttpError(422, 'Hay campos por corregir.', { errors });
    const [r] = await tx`update cms.documents set published = ${tx.json(data as never)}, draft = null, rev = rev + 1, published_at = now(), updated_at = now() where site_id = ${c.site} and id = ${id} returning *`;
    await tx`insert into cms.revisions (site_id, document_id, rev, action, data) values (${c.site}, ${id}, ${r.rev as number}, 'publish', ${tx.json(data as never)})`;
    await markForBuild(tx, c); await bump(tx, c); await audit(tx, c, 'doc.publish', id);
    return toDoc(r);
  });
}

export async function discardDraft(sql: Sql, c: Ctx, id: string) {
  return sql.begin(async (tx) => {
    const doc = await lockDoc(tx, c, id);
    if (!doc.published) throw new HttpError(409, 'Este documento nunca se publicó; no hay versión a la que volver.');
    const [r] = await tx`update cms.documents set draft = null, rev = rev + 1, updated_at = now() where site_id = ${c.site} and id = ${id} returning *`;
    await tx`insert into cms.revisions (site_id, document_id, rev, action, data) values (${c.site}, ${id}, ${r.rev as number}, 'discard', ${tx.json(doc.published as never)})`;
    await bump(tx, c); await audit(tx, c, 'doc.discard', id);
    return toDoc(r);
  });
}

export async function unpublish(sql: Sql, c: Ctx, id: string) {
  return sql.begin(async (tx) => {
    const doc = await lockDoc(tx, c, id);
    if (!doc.published) return doc;
    const [r] = await tx`update cms.documents set draft = coalesce(draft, published), published = null, published_at = null, rev = rev + 1, updated_at = now() where site_id = ${c.site} and id = ${id} returning *`;
    await tx`insert into cms.revisions (site_id, document_id, rev, action, data) values (${c.site}, ${id}, ${r.rev as number}, 'unpublish', null)`;
    await markForBuild(tx, c); await bump(tx, c); await audit(tx, c, 'doc.unpublish', id);
    return toDoc(r);
  });
}

export async function deleteDocument(sql: Sql, c: Ctx, id: string) {
  await sql.begin(async (tx) => {
    const doc = await lockDoc(tx, c, id);
    const [ref] = await tx`select id from cms.documents d where d.site_id = ${c.site} and d.id <> ${id} and (
        exists (select 1 from jsonb_each_text(coalesce(d.draft, '{}'::jsonb)) e where e.value = ${id})
     or exists (select 1 from jsonb_each_text(coalesce(d.published, '{}'::jsonb)) e where e.value = ${id})) limit 1`;
    if (ref) throw new HttpError(409, 'Otro documento enlaza a este. Quita esa referencia antes de eliminarlo.');
    await tx`delete from cms.documents where site_id = ${c.site} and id = ${id}`;
    if (doc.published) await markForBuild(tx, c);
    await bump(tx, c); await audit(tx, c, 'doc.delete', id);
  });
}

export async function duplicate(sql: Sql, c: Ctx, id: string) {
  return sql.begin(async (tx) => {
    const src = await lockDoc(tx, c, id);
    const [tr] = await tx`select * from cms.content_types where site_id = ${c.site} and id = ${src.typeId}`;
    const data: DocData = structuredClone(src.draft ?? src.published ?? {});
    const t = tr ? toType(tr) : undefined;
    if (t && typeof data[t.titleField] === 'string') data[t.titleField] = `${data[t.titleField] as string} (copia)`;
    const newDocId = newId(src.typeId);
    const [r] = await tx`insert into cms.documents (site_id, id, type_id, draft) values (${c.site}, ${newDocId}, ${src.typeId}, ${tx.json(data as never)}) returning *`;
    await tx`insert into cms.revisions (site_id, document_id, rev, action, data) values (${c.site}, ${newDocId}, 1, 'duplicate', ${tx.json(data as never)})`;
    await bump(tx, c); await audit(tx, c, 'doc.duplicate', newDocId, { from: id });
    return toDoc(r);
  });
}

// ---------- Importación (Strapi, JSON, CSV) ----------

/**
 * Guarda un lote importado en una sola transacción: crea o amplía los tipos e inserta los documentos.
 * Con publish, solo se publican los que pasan la misma validación que el botón Publicar; el resto queda en borrador.
 * Los documentos se insertan con una sola consulta por tabla (la base está lejos: una consulta por fila sería lenta).
 */
export async function importContent(sql: Sql, c: Ctx, batch: ImportBatch): Promise<ImportResult> {
  return sql.begin(async (tx) => {
    for (const t of batch.types) {
      await tx`insert into cms.content_types (site_id, id, name, plural, color, title_field, fields)
        values (${c.site}, ${t.id}, ${t.name}, ${t.plural}, ${t.color}, ${t.titleField}, ${tx.json(t.fields as never)})
        on conflict (site_id, id) do update set name = excluded.name, plural = excluded.plural, color = excluded.color,
          title_field = excluded.title_field, fields = excluded.fields, version = cms.content_types.version + 1, updated_at = now()`;
    }
    const types = new Map((await tx`select * from cms.content_types where site_id = ${c.site}`).map((r) => [r.id as string, toType(r)]));
    for (const t of batch.types) for (const f of t.fields) {
      if (f.kind === 'reference' && f.refType && !types.has(f.refType)) throw new HttpError(422, `El campo «${f.label}» de «${t.name}» enlaza a un tipo que no existe en este sitio.`);
    }

    const rows = batch.documents.map((d) => {
      const type = types.get(d.typeId);
      if (!type) throw new HttpError(422, 'Un documento del lote apunta a un tipo que no existe en este sitio.');
      return { id: d.id, typeId: d.typeId, data: d.data, live: d.publish && Object.keys(validate(type, d.data)).length === 0 };
    });
    if (rows.length) {
      const [dup] = await tx`select id from cms.documents where site_id = ${c.site} and id in ${tx(rows.map((r) => r.id))} limit 1`;
      if (dup) throw new HttpError(409, 'Parte de este lote ya se había importado. Vuelve a preparar la importación.');
      const json = tx.json(rows as never);
      await tx`insert into cms.documents (site_id, id, type_id, draft, published, rev, published_at)
        select ${c.site}, x->>'id', x->>'typeId',
          case when (x->>'live')::boolean then null else x->'data' end,
          case when (x->>'live')::boolean then x->'data' end,
          1, case when (x->>'live')::boolean then now() end
        from jsonb_array_elements(${json}) x`;
      await tx`insert into cms.revisions (site_id, document_id, rev, action, data)
        select ${c.site}, x->>'id', 1, case when (x->>'live')::boolean then 'publish' else 'create' end, x->'data'
        from jsonb_array_elements(${json}) x`;
    }
    const published = rows.filter((r) => r.live).length;
    if (published) await markForBuild(tx, c);
    await bump(tx, c);
    await audit(tx, c, 'import', undefined, { types: batch.types.map((t) => t.id), created: rows.length, published });
    return { types: batch.types.length, created: rows.length, published };
  });
}

// ---------- Imágenes ----------

export async function saveAsset(sql: Sql, c: Ctx, meta: Omit<Asset, 'id' | 'createdAt'>, content: Uint8Array): Promise<Asset> {
  const id = newId('img');
  return sql.begin(async (tx) => {
    const [r] = await tx`insert into cms.assets (site_id, id, width, height, bytes, mime, original_name) values (${c.site}, ${id}, ${meta.width}, ${meta.height}, ${meta.bytes}, ${meta.type}, ${meta.originalName}) returning *`;
    await tx`insert into cms.asset_blobs (site_id, asset_id, content) values (${c.site}, ${id}, ${Buffer.from(content)}::bytea)`;
    await audit(tx, c, 'asset.upload', id, { bytes: meta.bytes });
    return { id, width: r.width as number, height: r.height as number, bytes: r.bytes as number, type: r.mime as string, originalName: r.original_name as string, createdAt: iso(r.created_at)! };
  });
}

export async function getAssetContent(sql: Sql, c: Ctx, id: string) {
  const [r] = await sql`select a.mime, b.content from cms.assets a join cms.asset_blobs b on b.site_id = a.site_id and b.asset_id = a.id where a.site_id = ${c.site} and a.id = ${id}`;
  return r ? { mime: r.mime as string, content: new Uint8Array(r.content as ArrayBufferLike) } : undefined;
}

// ---------- Sitio público ----------

async function writeBuild(tx: TransactionSql, site: string, initial = false) {
  const types = (await tx`select * from cms.content_types where site_id = ${site} order by created_at, id`).map(toType);
  const docs = await tx`select id, type_id, published, published_at from cms.documents where site_id = ${site} and published is not null order by published_at desc`;
  const [{ now }] = await tx`select now() as now`;
  const snapshot: SiteSnapshot = {
    builtAt: iso(now)!, types,
    documents: docs.map((d) => ({ id: d.id as string, typeId: d.type_id as string, data: d.published as DocData, publishedAt: iso(d.published_at)! })),
  };
  await tx`insert into cms.site_builds (site_id, snapshot) values (${site}, ${tx.json(snapshot as never)})`;
  await tx`delete from cms.site_builds where site_id = ${site} and id not in (select id from cms.site_builds where site_id = ${site} order by id desc limit 20)`;
  if (!initial) await tx`update cms.site_state set pending = 0, building = false, next_build_at = null, last_built_at = now(), change_seq = change_seq + 1 where site_id = ${site}`;
}

/** Compila un sitio (o, sin sitio, todos los que tengan publicaciones vencidas: lo usa el Cron Trigger). */
/** Devuelve los sitios que se compilaron, para publicarlos en KV. */
export async function maybeBuild(sql: Sql, site?: string, force = false): Promise<string[]> {
  return sql.begin(async (tx) => {
    const due = site
      ? await tx`select site_id from cms.site_state where site_id = ${site} and pending > 0 and (${force} or next_build_at <= now()) for update skip locked`
      : await tx`select site_id from cms.site_state where pending > 0 and next_build_at <= now() for update skip locked`;
    for (const r of due) await writeBuild(tx, r.site_id as string);
    return due.map((r) => r.site_id as string);
  });
}

export async function siteStatus(sql: Sql, c: Ctx): Promise<SiteStatus & { changeSeq: number }> {
  const [s] = await sql`select * from cms.site_state where site_id = ${c.site}`;
  if (!s) throw new HttpError(404, 'El sitio no existe.');
  return { pending: s.pending as number, building: s.building as boolean, lastBuiltAt: iso(s.last_built_at), nextBuildAt: iso(s.next_build_at), changeSeq: Number(s.change_seq) };
}

export async function latestSnapshot(sql: Sql, c: Ctx): Promise<SiteSnapshot | null> {
  const [r] = await sql`select snapshot from cms.site_builds where site_id = ${c.site} order by id desc limit 1`;
  return r ? (r.snapshot as SiteSnapshot) : null;
}
