import { Hono, type Context } from 'hono';
import postgres from 'postgres';

type Sql = postgres.Sql;
import { z } from 'zod';
import * as repo from './repo';
import { HttpError } from './repo';

export interface Env {
  DATABASE_URL?: string;
  /** Al desplegar: binding de Hyperdrive hacia Neon. */
  HYPERDRIVE?: { connectionString: string };
  /** Solo en desarrollo local (.dev.vars). Sin esto, el API exige Cloudflare Access. */
  DEV_AUTH?: string;
  BUILD_BATCH_SECONDS?: string;
}

type Vars = { sql: Sql; actor: string; ctx: repo.Ctx };
const app = new Hono<{ Bindings: Env; Variables: Vars }>().basePath('/api/v1');

const MAX_JSON = 1024 * 1024;
const MAX_IMAGE = 5 * 1024 * 1024;

function connect(env: Env): Sql {
  // En local manda DATABASE_URL (.dev.vars); desplegado no existe y se usa el pool de Hyperdrive.
  const url = env.DATABASE_URL ?? env.HYPERDRIVE?.connectionString;
  if (!url) throw new HttpError(503, 'El API no tiene base de datos configurada.');
  return postgres(url, { max: 5, fetch_types: false, onnotice: () => {} });
}

const batch = (env: Env) => Math.max(1, Math.min(3600, Number(env.BUILD_BATCH_SECONDS ?? 300) || 300));

// Identidad: en producción la da Cloudflare Access (JWT verificado en replica-deploy). Hasta entonces, falla cerrado.
app.use('*', async (c, next) => {
  if (c.env.DEV_AUTH === '1') c.set('actor', 'dev@local');
  else return c.json({ error: 'Acceso no configurado. Este API solo responde detrás de Cloudflare Access.' }, 401);
  const len = Number(c.req.header('content-length') ?? 0);
  const isImage = c.req.path.endsWith('/assets') && c.req.method === 'POST';
  if (len > (isImage ? MAX_IMAGE : MAX_JSON)) return c.json({ error: 'El contenido es demasiado grande.' }, 413);
  const sql = connect(c.env);
  c.set('sql', sql);
  try { await next(); }
  finally { c.executionCtx.waitUntil(sql.end({ timeout: 5 })); }
});

app.onError((err, c) => {
  if (err instanceof HttpError) return c.json({ error: err.message, ...err.body }, err.status as 400);
  if (err instanceof z.ZodError) return c.json({ error: 'Datos con formato incorrecto.', issues: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })) }, 400);
  console.error(err);
  return c.json({ error: 'Algo falló en el servidor. Inténtalo de nuevo.' }, 500);
});

// ---------- Esquemas de entrada (validación en el servidor, nunca solo en el navegador) ----------

const id = z.string().regex(/^[a-z0-9_]{1,80}$/);
const field = z.object({
  key: z.string().regex(/^[a-z0-9_]{1,64}$/),
  label: z.string().trim().min(1).max(80),
  kind: z.enum(['string', 'number', 'text', 'richtext', 'boolean', 'reference', 'image']),
  required: z.boolean(),
  help: z.string().max(300).optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  unit: z.string().max(12).optional(),
  refType: id.optional(),
});
const contentType = z.object({
  id: z.string().regex(/^[a-z0-9_]{1,64}$/),
  name: z.string().trim().min(1).max(80),
  plural: z.string().trim().min(1).max(80),
  color: z.enum(['red', 'blue', 'green', 'amber', 'violet']),
  titleField: z.string().regex(/^[a-z0-9_]{1,64}$/),
  fields: z.array(field).min(1).max(60),
  version: z.number().int().optional(),
}).refine((t) => new Set(t.fields.map((f) => f.key)).size === t.fields.length, 'Hay dos campos con el mismo nombre.')
  .refine((t) => t.fields.some((f) => f.key === t.titleField), 'El campo de título no existe.');
const docData = z.record(z.string().regex(/^[a-z0-9_]{1,64}$/), z.unknown());
const withRev = z.object({ rev: z.number().int().positive() });

const body = async <T>(c: Context, schema: z.ZodType<T>) => schema.parse(await c.req.json().catch(() => { throw new HttpError(400, 'El cuerpo no es JSON válido.'); }));
const param = (c: Context, name: string) => id.parse(c.req.param(name));

// ---------- Rutas ----------

const siteId = z.string().regex(/^[a-z0-9-]{2,40}$/);

app.get('/sites', async (c) => { await repo.ensureSeeded(c.var.sql, c.var.actor); return c.json(await repo.listSites(c.var.sql)); });
app.post('/sites', async (c) => {
  const { id, name } = await body(c, z.object({ id: siteId, name: z.string().trim().min(1).max(80) }));
  return c.json(await repo.createSite(c.var.sql, id, name, c.var.actor), 201);
});

// Todo lo demás pertenece a un sitio: se comprueba que existe y cada consulta lleva su id.
app.use('/s/:site/*', async (c, next) => {
  const site = siteId.parse(c.req.param('site'));
  if (!(await repo.siteExists(c.var.sql, site))) throw new HttpError(404, 'Ese sitio no existe.');
  c.set('ctx', { site, actor: c.var.actor, batchSeconds: batch(c.env) });
  await next();
});


app.get('/s/:site/changes', async (c) => {
  await repo.maybeBuild(c.var.sql, c.var.ctx.site);
  const s = await repo.siteStatus(c.var.sql, c.var.ctx);
  return c.json({ seq: s.changeSeq });
});

app.get('/s/:site/types', async (c) => { return c.json(await repo.listTypes(c.var.sql, c.var.ctx)); });
app.put('/s/:site/types/:id', async (c) => {
  const t = await body(c, contentType);
  if (t.id !== c.req.param('id')) throw new HttpError(400, 'El id del tipo no coincide con la dirección.');
  return c.json(await repo.saveType(c.var.sql, c.var.ctx, { ...t, version: t.version ?? 0 }));
});
app.delete('/s/:site/types/:id', async (c) => { await repo.deleteType(c.var.sql, c.var.ctx, param(c, 'id')); return c.body(null, 204); });

app.get('/s/:site/documents', async (c) => {
  const type = c.req.query('type');
  return c.json(await repo.listDocuments(c.var.sql, c.var.ctx, type ? id.parse(type) : undefined));
});
app.post('/s/:site/documents', async (c) => {
  const { typeId } = await body(c, z.object({ typeId: id }));
  return c.json(await repo.createDocument(c.var.sql, c.var.ctx, typeId), 201);
});
app.get('/s/:site/documents/:id', async (c) => {
  const d = await repo.getDocument(c.var.sql, c.var.ctx, param(c, 'id'));
  return d ? c.json(d) : c.json({ error: 'El documento no existe.' }, 404);
});
app.patch('/s/:site/documents/:id/draft', async (c) => {
  const { data, rev } = await body(c, z.object({ data: docData, rev: z.number().int().positive() }));
  return c.json(await repo.updateDraft(c.var.sql, c.var.ctx, param(c, 'id'), data, rev));
});
app.post('/s/:site/documents/:id/publish', async (c) => {
  const { rev } = await body(c, withRev);
  return c.json(await repo.publish(c.var.sql, c.var.ctx, param(c, 'id'), rev));
});
app.post('/s/:site/documents/:id/discard', async (c) => c.json(await repo.discardDraft(c.var.sql, c.var.ctx, param(c, 'id'))));
app.post('/s/:site/documents/:id/unpublish', async (c) => c.json(await repo.unpublish(c.var.sql, c.var.ctx, param(c, 'id'))));
app.post('/s/:site/documents/:id/duplicate', async (c) => c.json(await repo.duplicate(c.var.sql, c.var.ctx, param(c, 'id')), 201));
app.delete('/s/:site/documents/:id', async (c) => { await repo.deleteDocument(c.var.sql, c.var.ctx, param(c, 'id')); return c.body(null, 204); });

const MAGIC: Record<string, (b: Uint8Array) => boolean> = {
  'image/webp': (b) => b.length > 12 && String.fromCharCode(...b.slice(0, 4)) === 'RIFF' && String.fromCharCode(...b.slice(8, 12)) === 'WEBP',
  'image/jpeg': (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  'image/png': (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
};

app.post('/s/:site/assets', async (c) => {
  const mime = (c.req.header('content-type') ?? '').split(';')[0].trim();
  const check = MAGIC[mime];
  if (!check) throw new HttpError(415, 'Solo se aceptan imágenes WebP, JPG o PNG.');
  const q = z.object({ width: z.coerce.number().int().min(1).max(10000), height: z.coerce.number().int().min(1).max(10000), name: z.string().max(200).default('') }).parse(c.req.query());
  const bytes = new Uint8Array(await c.req.arrayBuffer());
  if (bytes.length === 0 || bytes.length > MAX_IMAGE) throw new HttpError(413, 'La imagen pesa más de 5 MB después de optimizarla.');
  // Se revisan los bytes reales, no solo el tipo que declara el navegador.
  if (!check(bytes)) throw new HttpError(415, 'El archivo no es la imagen que dice ser.');
  return c.json(await repo.saveAsset(c.var.sql, c.var.ctx, { width: q.width, height: q.height, bytes: bytes.length, type: mime, originalName: q.name }, bytes), 201);
});
app.get('/s/:site/assets/:id/content', async (c) => {
  const a = await repo.getAssetContent(c.var.sql, c.var.ctx, z.string().regex(/^img_[a-z0-9]{6,20}$/).parse(c.req.param('id')));
  if (!a) return c.json({ error: 'La imagen no existe.' }, 404);
  return new Response(a.content, { headers: { 'content-type': a.mime, 'cache-control': 'private, max-age=31536000, immutable', 'x-content-type-options': 'nosniff' } });
});

app.get('/s/:site/site/status', async (c) => {
  await repo.maybeBuild(c.var.sql, c.var.ctx.site);
  const { changeSeq: _ignored, ...status } = await repo.siteStatus(c.var.sql, c.var.ctx);
  return c.json(status);
});
app.post('/s/:site/site/build', async (c) => { await repo.maybeBuild(c.var.sql, c.var.ctx.site, true); return c.body(null, 204); });
app.get('/s/:site/site/snapshot', async (c) => c.json(await repo.latestSnapshot(c.var.sql, c.var.ctx)));

app.post('/s/:site/demo/reset', async (c) => { await repo.resetDemo(c.var.sql, c.var.ctx); return c.body(null, 204); });

app.notFound((c) => c.json({ error: 'Ruta no encontrada.' }, 404));

export default {
  fetch: app.fetch,
  // Cron Trigger: compila el sitio si hay publicaciones esperando (architecture.md, «Programación sin gastar la base»).
  async scheduled(_event: ScheduledController, env: Env, ctx: ExecutionContext) {
    const sql = connect(env);
    ctx.waitUntil(repo.maybeBuild(sql).finally(() => sql.end({ timeout: 5 })));
  },
} satisfies ExportedHandler<Env>;
