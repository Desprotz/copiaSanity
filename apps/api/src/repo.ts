import type postgres from 'postgres';

type Sql = postgres.Sql;
type TransactionSql = postgres.TransactionSql;
// Dominio compartido con el editor: la misma validación corre en el navegador y aquí (la de aquí es la que manda).
import { newId, validate } from '../../editor/src/data/domain';
import { SEED_TYPES, seedDocuments } from '../../editor/src/data/seed';
import type { Asset, CmsDocument, ContentType, DocData, SiteSnapshot, SiteStatus } from '../../editor/src/data/types';

export class HttpError extends Error {
  constructor(public status: number, message: string, public body?: Record<string, unknown>) { super(message); }
}

type Db = Sql | TransactionSql;
type Row = Record<string, unknown>;

const iso = (v: unknown): string | null => (v instanceof Date ? v.toISOString() : typeof v === 'string' ? new Date(v).toISOString() : null);

function toDoc(r: Row): CmsDocument {
  return {
    id: r.id as string, typeId: r.type_id as string,
    draft: (r.draft as DocData | null) ?? null, published: (r.published as DocData | null) ?? null,
    rev: r.rev as number, createdAt: iso(r.created_at)!, updatedAt: iso(r.updated_at)!, publishedAt: iso(r.published_at),
  };
}

function toType(r: Row): ContentType {
  return { id: r.id as string, name: r.name as string, plural: r.plural as string, color: r.color as ContentType['color'], titleField: r.title_field as string, fields: r.fields as ContentType['fields'], version: r.version as number };
}

async function audit(db: Db, actor: string, action: string, target?: string, detail?: unknown) {
  await db`insert into cms.audit_events (actor, action, target, detail) values (${actor}, ${action}, ${target ?? null}, ${detail === undefined ? null : db.json(detail as never)})`;
}

const bump = (db: Db) => db`update cms.site_state set change_seq = change_seq + 1 where id = 1`;

async function markForBuild(db: Db, batchSeconds: number) {
  await db`update cms.site_state set pending = pending + 1, next_build_at = now() + make_interval(secs => ${batchSeconds}) where id = 1`;
}

async function lockDoc(db: Db, id: string): Promise<CmsDocument> {
  const [r] = await db`select * from cms.documents where id = ${id} for update`;
  if (!r) throw new HttpError(404, 'El documento no existe.');
  return toDoc(r);
}

function assertRev(doc: CmsDocument, expected: number) {
  if (doc.rev !== expected) throw new HttpError(409, 'El documento cambió en otra pestaña o equipo.', { current: doc });
}

// ---------- Datos de prueba ----------

async function seedInto(tx: TransactionSql, actor: string) {
  await tx`truncate cms.revisions, cms.documents, cms.content_types, cms.asset_blobs, cms.assets, cms.site_builds restart identity cascade`;
  // created_at escalonado para conservar el orden del menú (todas las filas comparten la misma transacción).
  for (const [i, t] of SEED_TYPES.entries()) {
    await tx`insert into cms.content_types (id, name, plural, color, title_field, fields, version, created_at)
      values (${t.id}, ${t.name}, ${t.plural}, ${t.color}, ${t.titleField}, ${tx.json(t.fields as never)}, ${t.version}, now() + make_interval(secs => ${i / 1000}))`;
  }
  for (const d of seedDocuments()) {
    await tx`insert into cms.documents (id, type_id, draft, published, rev, created_at, updated_at, published_at)
      values (${d.id}, ${d.typeId}, ${d.draft ? tx.json(d.draft as never) : null}, ${d.published ? tx.json(d.published as never) : null}, ${d.rev}, ${d.createdAt}::timestamptz, ${d.updatedAt}::timestamptz, ${d.publishedAt}::timestamptz)`;
    await tx`insert into cms.revisions (document_id, rev, action, data) values (${d.id}, ${d.rev}, 'create', ${tx.json((d.draft ?? d.published) as never)})`;
  }
  await tx`update cms.site_state set pending = 0, building = false, next_build_at = null, last_built_at = now() - interval '1 hour', change_seq = change_seq + 1 where id = 1`;
  await writeBuild(tx, true);
  await audit(tx, actor, 'demo.reset');
}

export async function ensureSeeded(sql: Sql, actor: string) {
  const [{ n }] = await sql`select count(*)::int as n from cms.content_types`;
  if (n > 0) return;
  await sql.begin(async (tx) => {
    await tx`select pg_advisory_xact_lock(4242)`;
    const [{ m }] = await tx`select count(*)::int as m from cms.content_types`;
    if (m === 0) await seedInto(tx, actor);
  });
}

export const resetDemo = (sql: Sql, actor: string) => sql.begin(async (tx) => { await tx`select pg_advisory_xact_lock(4242)`; await seedInto(tx, actor); });

// ---------- Tipos ----------

export async function listTypes(sql: Sql) {
  return (await sql`select * from cms.content_types order by created_at, id`).map(toType);
}

export async function saveType(sql: Sql, t: ContentType, actor: string) {
  return sql.begin(async (tx) => {
    const [r] = await tx`insert into cms.content_types (id, name, plural, color, title_field, fields)
      values (${t.id}, ${t.name}, ${t.plural}, ${t.color}, ${t.titleField}, ${tx.json(t.fields as never)})
      on conflict (id) do update set name = excluded.name, plural = excluded.plural, color = excluded.color,
        title_field = excluded.title_field, fields = excluded.fields, version = cms.content_types.version + 1, updated_at = now()
      returning *`;
    await bump(tx); await audit(tx, actor, 'type.save', t.id);
    return toType(r);
  });
}

export async function deleteType(sql: Sql, id: string, actor: string) {
  await sql.begin(async (tx) => {
    const [{ n }] = await tx`select count(*)::int as n from cms.documents where type_id = ${id}`;
    if (n > 0) throw new HttpError(409, 'Este tipo todavía tiene documentos. Elimínalos primero.');
    await tx`delete from cms.content_types where id = ${id}`;
    await bump(tx); await audit(tx, actor, 'type.delete', id);
  });
}

// ---------- Documentos ----------

export async function listDocuments(sql: Sql, typeId?: string) {
  const rows = typeId
    ? await sql`select * from cms.documents where type_id = ${typeId} order by updated_at desc`
    : await sql`select * from cms.documents order by updated_at desc`;
  return rows.map(toDoc);
}

export async function getDocument(sql: Sql, id: string) {
  const [r] = await sql`select * from cms.documents where id = ${id}`;
  return r ? toDoc(r) : undefined;
}

export async function createDocument(sql: Sql, typeId: string, actor: string) {
  return sql.begin(async (tx) => {
    const [t] = await tx`select id from cms.content_types where id = ${typeId}`;
    if (!t) throw new HttpError(404, 'Ese tipo de contenido no existe.');
    const id = newId(typeId);
    const [r] = await tx`insert into cms.documents (id, type_id, draft) values (${id}, ${typeId}, ${tx.json({})}) returning *`;
    await tx`insert into cms.revisions (document_id, rev, action, data) values (${id}, 1, 'create', ${tx.json({})})`;
    await bump(tx); await audit(tx, actor, 'doc.create', id);
    return toDoc(r);
  });
}

export async function updateDraft(sql: Sql, id: string, data: DocData, expectedRev: number) {
  return sql.begin(async (tx) => {
    const doc = await lockDoc(tx, id); assertRev(doc, expectedRev);
    // El autoguardado no agrega filas al historial (sería una por cada pausa al escribir); sí lo hacen publicar, retirar y descartar.
    const [r] = await tx`update cms.documents set draft = ${tx.json(data as never)}, rev = rev + 1, updated_at = now() where id = ${id} returning *`;
    await bump(tx);
    return toDoc(r);
  });
}

export async function publish(sql: Sql, id: string, expectedRev: number, actor: string, batchSeconds: number) {
  return sql.begin(async (tx) => {
    const doc = await lockDoc(tx, id); assertRev(doc, expectedRev);
    const [tr] = await tx`select * from cms.content_types where id = ${doc.typeId}`;
    const data = doc.draft ?? doc.published;
    if (!tr || !data) throw new HttpError(422, 'No hay nada que publicar.');
    const errors = validate(toType(tr), data);
    if (Object.keys(errors).length) throw new HttpError(422, 'Hay campos por corregir.', { errors });
    const [r] = await tx`update cms.documents set published = ${tx.json(data as never)}, draft = null, rev = rev + 1, published_at = now(), updated_at = now() where id = ${id} returning *`;
    await tx`insert into cms.revisions (document_id, rev, action, data) values (${id}, ${r.rev as number}, 'publish', ${tx.json(data as never)})`;
    await markForBuild(tx, batchSeconds); await bump(tx); await audit(tx, actor, 'doc.publish', id);
    return toDoc(r);
  });
}

export async function discardDraft(sql: Sql, id: string, actor: string) {
  return sql.begin(async (tx) => {
    const doc = await lockDoc(tx, id);
    if (!doc.published) throw new HttpError(409, 'Este documento nunca se publicó; no hay versión a la que volver.');
    const [r] = await tx`update cms.documents set draft = null, rev = rev + 1, updated_at = now() where id = ${id} returning *`;
    await tx`insert into cms.revisions (document_id, rev, action, data) values (${id}, ${r.rev as number}, 'discard', ${tx.json(doc.published as never)})`;
    await bump(tx); await audit(tx, actor, 'doc.discard', id);
    return toDoc(r);
  });
}

export async function unpublish(sql: Sql, id: string, actor: string, batchSeconds: number) {
  return sql.begin(async (tx) => {
    const doc = await lockDoc(tx, id);
    if (!doc.published) return doc;
    const [r] = await tx`update cms.documents set draft = coalesce(draft, published), published = null, published_at = null, rev = rev + 1, updated_at = now() where id = ${id} returning *`;
    await tx`insert into cms.revisions (document_id, rev, action, data) values (${id}, ${r.rev as number}, 'unpublish', null)`;
    await markForBuild(tx, batchSeconds); await bump(tx); await audit(tx, actor, 'doc.unpublish', id);
    return toDoc(r);
  });
}

export async function deleteDocument(sql: Sql, id: string, actor: string, batchSeconds: number) {
  await sql.begin(async (tx) => {
    const doc = await lockDoc(tx, id);
    const [ref] = await tx`select id from cms.documents d where d.id <> ${id} and (
        exists (select 1 from jsonb_each_text(coalesce(d.draft, '{}'::jsonb)) e where e.value = ${id})
     or exists (select 1 from jsonb_each_text(coalesce(d.published, '{}'::jsonb)) e where e.value = ${id})) limit 1`;
    if (ref) throw new HttpError(409, 'Otro documento enlaza a este. Quita esa referencia antes de eliminarlo.');
    await tx`delete from cms.documents where id = ${id}`;
    if (doc.published) await markForBuild(tx, batchSeconds);
    await bump(tx); await audit(tx, actor, 'doc.delete', id);
  });
}

export async function duplicate(sql: Sql, id: string, actor: string) {
  return sql.begin(async (tx) => {
    const src = await lockDoc(tx, id);
    const [tr] = await tx`select * from cms.content_types where id = ${src.typeId}`;
    const data: DocData = structuredClone(src.draft ?? src.published ?? {});
    const t = tr ? toType(tr) : undefined;
    if (t && typeof data[t.titleField] === 'string') data[t.titleField] = `${data[t.titleField] as string} (copia)`;
    const newDocId = newId(src.typeId);
    const [r] = await tx`insert into cms.documents (id, type_id, draft) values (${newDocId}, ${src.typeId}, ${tx.json(data as never)}) returning *`;
    await tx`insert into cms.revisions (document_id, rev, action, data) values (${newDocId}, 1, 'duplicate', ${tx.json(data as never)})`;
    await bump(tx); await audit(tx, actor, 'doc.duplicate', newDocId, { from: id });
    return toDoc(r);
  });
}

// ---------- Imágenes ----------

export async function saveAsset(sql: Sql, meta: Omit<Asset, 'id' | 'createdAt'>, content: Uint8Array, actor: string): Promise<Asset> {
  const id = newId('img');
  return sql.begin(async (tx) => {
    const [r] = await tx`insert into cms.assets (id, width, height, bytes, mime, original_name) values (${id}, ${meta.width}, ${meta.height}, ${meta.bytes}, ${meta.type}, ${meta.originalName}) returning *`;
    await tx`insert into cms.asset_blobs (asset_id, content) values (${id}, ${Buffer.from(content)}::bytea)`;
    await audit(tx, actor, 'asset.upload', id, { bytes: meta.bytes });
    return { id, width: r.width as number, height: r.height as number, bytes: r.bytes as number, type: r.mime as string, originalName: r.original_name as string, createdAt: iso(r.created_at)! };
  });
}

export async function getAssetContent(sql: Sql, id: string) {
  const [r] = await sql`select a.mime, b.content from cms.assets a join cms.asset_blobs b on b.asset_id = a.id where a.id = ${id}`;
  return r ? { mime: r.mime as string, content: new Uint8Array(r.content as ArrayBufferLike) } : undefined;
}

// ---------- Sitio ----------

async function writeBuild(tx: TransactionSql, initial = false) {
  const types = (await tx`select * from cms.content_types order by created_at, id`).map(toType);
  const docs = await tx`select id, type_id, published, published_at from cms.documents where published is not null order by published_at desc`;
  const [{ now }] = await tx`select now() as now`;
  const snapshot: SiteSnapshot = {
    builtAt: iso(now)!, types,
    documents: docs.map((d) => ({ id: d.id as string, typeId: d.type_id as string, data: d.published as DocData, publishedAt: iso(d.published_at)! })),
  };
  await tx`insert into cms.site_builds (snapshot) values (${tx.json(snapshot as never)})`;
  await tx`delete from cms.site_builds where id not in (select id from cms.site_builds order by id desc limit 20)`;
  if (!initial) await tx`update cms.site_state set pending = 0, building = false, next_build_at = null, last_built_at = now(), change_seq = change_seq + 1 where id = 1`;
}

/**
 * Compila el sitio si hay publicaciones esperando y ya pasó el tiempo de agrupamiento (o si force).
 * La llaman el Cron Trigger y, mientras alguien usa el editor, las consultas de estado.
 * Hoy la «compilación» guarda una foto en site_builds; en replica-deploy además llamará al deploy hook de Pages.
 */
export async function maybeBuild(sql: Sql, force = false): Promise<boolean> {
  return sql.begin(async (tx) => {
    const [s] = await tx`select pending, next_build_at <= now() as due from cms.site_state where id = 1 for update skip locked`;
    if (!s || (s.pending as number) === 0 || (!force && !s.due)) return false;
    await writeBuild(tx);
    return true;
  });
}

export async function siteStatus(sql: Sql): Promise<SiteStatus & { changeSeq: number }> {
  const [s] = await sql`select * from cms.site_state where id = 1`;
  return { pending: s.pending as number, building: s.building as boolean, lastBuiltAt: iso(s.last_built_at), nextBuildAt: iso(s.next_build_at), changeSeq: Number(s.change_seq) };
}

export async function latestSnapshot(sql: Sql): Promise<SiteSnapshot | null> {
  const [r] = await sql`select snapshot from cms.site_builds order by id desc limit 1`;
  return r ? (r.snapshot as SiteSnapshot) : null;
}
