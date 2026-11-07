import { Hono, type Context } from 'hono';
import postgres from 'postgres';

type Sql = postgres.Sql;
import { z } from 'zod';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import * as auth from './auth';
import * as repo from './repo';
import { HttpError } from './repo';

export interface Env {
  DATABASE_URL?: string;
  /** Al desplegar: binding de Hyperdrive hacia Neon. */
  HYPERDRIVE?: { connectionString: string };
  BUILD_BATCH_SECONDS?: string;
  /** Marca de compilación pendiente: el Cron la lee y solo abre Neon si toca compilar. */
  FLAGS?: KVNamespace;
}

type Vars = { sql: Sql; actor: string; ctx: repo.Ctx; user: auth.SessionUser };
const app = new Hono<{ Bindings: Env; Variables: Vars }>().basePath('/api/v1');

const MAX_JSON = 1024 * 1024;
const MAX_IMAGE = 5 * 1024 * 1024;

function connect(env: Env): Sql {
  // En local manda DATABASE_URL (.dev.vars); desplegado no existe y se usa el pool de Hyperdrive.
  const url = env.DATABASE_URL ?? env.HYPERDRIVE?.connectionString;
  if (!url) throw new HttpError(503, 'El API no tiene base de datos configurada.');
  return postgres(url, { max: 5, fetch_types: false, onnotice: () => {} });
}

/** Anota en KV cuándo vence la próxima compilación (no se gasta Neon en revisarlo cada 5 minutos). */
async function flagBuild(env: Env) {
  if (!env.FLAGS) return;
  const at = Date.now() + batch(env) * 1000;
  const prev = Number(await env.FLAGS.get('build-due'));
  if (!prev || at < prev) await env.FLAGS.put('build-due', String(at));
}

/**
 * Publica la última compilación de un sitio en KV: la web pública (otro Worker) lee de ahí y nunca toca Neon.
 * Las fotos referenciadas se copian una sola vez (KV: 1.000 escrituras/día en el plan gratuito).
 */
async function exportBuild(sql: Sql, env: Env, site: string) {
  if (!env.FLAGS) return;
  const snap = await repo.latestSnapshot(sql, { site, actor: 'build', batchSeconds: 0 });
  if (!snap) return;
  const ids = new Set<string>();
  JSON.stringify(snap.documents, (_k, v) => { if (v && typeof v === 'object' && typeof v.assetId === 'string') ids.add(v.assetId); return v; });
  for (const id of ids) {
    const key = `pub:${site}:img:${id}`;
    if (await env.FLAGS.get(key, 'stream')) continue;
    const a = await repo.getAssetContent(sql, { site, actor: 'build', batchSeconds: 0 }, id);
    if (a) await env.FLAGS.put(key, a.content, { metadata: { mime: a.mime } });
  }
  await env.FLAGS.put(`pub:${site}:snapshot`, JSON.stringify(snap));
}

async function buildAndExport(sql: Sql, env: Env, site?: string, force = false) {
  for (const s of await repo.maybeBuild(sql, site, force)) await exportBuild(sql, env, s);
}

const batch = (env: Env) => Math.max(1, Math.min(3600, Number(env.BUILD_BATCH_SECONDS ?? 300) || 300));

// Identidad: inicio de sesión propio (src/auth.ts). Sin sesión válida, todo lo que no sea /auth responde 401.
app.use('*', async (c, next) => {
  const len = Number(c.req.header('content-length') ?? 0);
  const isImage = c.req.path.endsWith('/assets') && c.req.method === 'POST';
  if (len > (isImage ? MAX_IMAGE : MAX_JSON)) return c.json({ error: 'El contenido es demasiado grande.' }, 413);
  // Defensa contra CSRF además de SameSite=Strict: las escrituras deben venir del propio editor.
  if (c.req.method !== 'GET' && c.req.header('x-cms') !== '1') return c.json({ error: 'Solicitud no permitida.' }, 403);
  const sql = connect(c.env);
  c.set('sql', sql);
  try {
    if (!c.req.path.startsWith('/api/v1/auth/')) {
      const user = await auth.sessionUser(sql, getCookie(c, auth.COOKIE));
      if (!user) return c.json({ error: 'Tu sesión terminó. Vuelve a iniciar sesión.' }, 401);
      c.set('user', user);
      c.set('actor', user.username);
    }
    await next();
  } finally { c.executionCtx.waitUntil(sql.end({ timeout: 5 })); }
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

app.post('/auth/login', async (c) => {
  const { username, password } = await body(c, z.object({ username: z.string().trim().toLowerCase().min(1).max(40), password: z.string().min(1).max(200) }));
  const ip = c.req.header('cf-connecting-ip') ?? c.req.header('x-forwarded-for') ?? 'local';
  const token = await auth.login(c.var.sql, username, password, ip);
  setCookie(c, auth.COOKIE, token, { httpOnly: true, secure: true, sameSite: 'Strict', path: '/api', maxAge: auth.SESSION_DAYS * 86400 });
  return c.json(await auth.sessionUser(c.var.sql, token));
});
app.post('/auth/logout', async (c) => {
  await auth.logout(c.var.sql, getCookie(c, auth.COOKIE));
  deleteCookie(c, auth.COOKIE, { path: '/api', secure: true });
  return c.body(null, 204);
});
app.get('/auth/me', async (c) => {
  const user = await auth.sessionUser(c.var.sql, getCookie(c, auth.COOKIE));
  return user ? c.json(user) : c.json({ error: 'Sin sesión.' }, 401);
});

app.get('/sites', async (c) => {
  await repo.ensureSeeded(c.var.sql, c.var.actor);
  const all = await repo.listSites(c.var.sql);
  const mine = [];
  for (const s of all) if (await auth.canUseSite(c.var.sql, c.var.user, s.id)) mine.push(s);
  return c.json(mine);
});
app.post('/sites', async (c) => {
  if (!c.var.user.isOwner) throw new HttpError(403, 'Solo el dueño de la cuenta puede crear sitios.');
  const { id, name } = await body(c, z.object({ id: siteId, name: z.string().trim().min(1).max(80) }));
  return c.json(await repo.createSite(c.var.sql, id, name, c.var.actor), 201);
});

app.delete('/sites/:id', async (c) => {
  if (!c.var.user.isOwner) throw new HttpError(403, 'Solo el dueño de la cuenta puede eliminar sitios.');
  const id = siteId.parse(c.req.param('id'));
  const { confirm } = await body(c, z.object({ confirm: z.string() }));
  const [s] = await c.var.sql`select name from cms.sites where id = ${id}`;
  if (!s) throw new HttpError(404, 'Ese sitio no existe.');
  // Segunda comprobación en el servidor: hay que escribir el nombre exacto.
  if (confirm.trim() !== String(s.name)) throw new HttpError(422, 'El nombre escrito no coincide con el del sitio.');
  await repo.deleteSite(c.var.sql, id, c.var.actor);
  if (c.env.FLAGS) {
    let cursor: string | undefined;
    do {
      const page = await c.env.FLAGS.list({ prefix: `pub:${id}:`, cursor });
      await Promise.all(page.keys.map((k) => c.env.FLAGS!.delete(k.name)));
      cursor = page.list_complete ? undefined : page.cursor;
    } while (cursor);
  }
  return c.body(null, 204);
});

// Todo lo demás pertenece a un sitio: se comprueba que existe y cada consulta lleva su id.
app.use('/s/:site/*', async (c, next) => {
  const site = siteId.parse(c.req.param('site'));
  // Un sitio ajeno responde igual que uno inexistente: no se revela qué sitios existen.
  if (!(await repo.siteExists(c.var.sql, site)) || !(await auth.canUseSite(c.var.sql, c.var.user, site))) throw new HttpError(404, 'Ese sitio no existe.');
  c.set('ctx', { site, actor: c.var.actor, batchSeconds: batch(c.env) });
  await next();
});


app.get('/s/:site/changes', async (c) => {
  await buildAndExport(c.var.sql, c.env, c.var.ctx.site);
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
  const d = await repo.publish(c.var.sql, c.var.ctx, param(c, 'id'), rev);
  await flagBuild(c.env);
  return c.json(d);
});
app.post('/s/:site/documents/:id/discard', async (c) => c.json(await repo.discardDraft(c.var.sql, c.var.ctx, param(c, 'id'))));
app.post('/s/:site/documents/:id/unpublish', async (c) => { const d = await repo.unpublish(c.var.sql, c.var.ctx, param(c, 'id')); await flagBuild(c.env); return c.json(d); });
app.post('/s/:site/documents/:id/duplicate', async (c) => c.json(await repo.duplicate(c.var.sql, c.var.ctx, param(c, 'id')), 201));
app.delete('/s/:site/documents/:id', async (c) => { await repo.deleteDocument(c.var.sql, c.var.ctx, param(c, 'id')); await flagBuild(c.env); return c.body(null, 204); });

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
  await buildAndExport(c.var.sql, c.env, c.var.ctx.site);
  const { changeSeq: _ignored, ...status } = await repo.siteStatus(c.var.sql, c.var.ctx);
  return c.json(status);
});
app.post('/s/:site/site/build', async (c) => {
  await buildAndExport(c.var.sql, c.env, c.var.ctx.site, true);
  // También republica aunque no hubiera cambios pendientes (útil la primera vez que se conecta una web).
  await exportBuild(c.var.sql, c.env, c.var.ctx.site);
  return c.body(null, 204);
});
app.get('/s/:site/site/snapshot', async (c) => c.json(await repo.latestSnapshot(c.var.sql, c.var.ctx)));

app.post('/s/:site/demo/reset', async (c) => { await repo.resetDemo(c.var.sql, c.var.ctx); return c.body(null, 204); });

app.notFound((c) => c.json({ error: 'Ruta no encontrada.' }, 404));

export default {
  fetch: app.fetch,
  // Cron Trigger: compila el sitio si hay publicaciones esperando (architecture.md, «Programación sin gastar la base»).
  async scheduled(_event: ScheduledController, env: Env, ctx: ExecutionContext) {
    // Primero KV (gratis y sin despertar Neon). Solo si hay una compilación vencida se abre la base.
    const due = Number(await env.FLAGS?.get('build-due'));
    if (env.FLAGS && (!due || due > Date.now())) return;
    const sql = connect(env);
    ctx.waitUntil((async () => {
      try {
        await buildAndExport(sql, env);
        const [{ n }] = await sql`select count(*)::int as n from cms.site_state where pending > 0`;
        if (n === 0) await env.FLAGS?.delete('build-due');
        else await env.FLAGS?.put('build-due', String(Date.now() + 60_000));
      } finally { await sql.end({ timeout: 5 }); }
    })());
  },
} satisfies ExportedHandler<Env>;
