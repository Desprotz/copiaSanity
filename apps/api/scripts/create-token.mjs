// Crea un token de API (JWT de solo lectura) para que un proyecto consulte el contenido de un sitio.
// El JWT se muestra UNA sola vez: cópialo al proyecto como secreto (p. ej. `wrangler secret put CMS_TOKEN`).
//
// Uso: npm run token -w apps/api -- --sitio tienda-ropa --nombre "Web de la tienda" [--dias 365]
//      npm run token -w apps/api -- --sitio tienda-ropa --listar
//      npm run token -w apps/api -- --sitio tienda-ropa --revocar tok_xxxxxxxx
//
// Lee DATABASE_URL y JWT_SECRET de apps/api/.dev.vars (o del entorno). JWT_SECRET debe ser el MISMO valor
// que el secreto del Worker desplegado (wrangler secret put JWT_SECRET); si no, el API rechazará el token.
import { createHmac, randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
let vars = {};
try {
  vars = Object.fromEntries(readFileSync(join(root, '.dev.vars'), 'utf8').split(/\r?\n/)
    .filter((l) => /^[A-Z_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()]));
} catch { /* sin archivo: se usa el entorno */ }
const env = (k) => process.env[k] ?? vars[k];

const arg = (name) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : undefined; };
const site = arg('--sitio');
if (!site || !/^[a-z0-9-]{2,40}$/.test(site)) {
  console.error('Indica el sitio: --sitio <id> (ej. --sitio tienda-ropa).');
  process.exit(1);
}

const url = env('DATABASE_URL');
if (!url) { console.error('Falta DATABASE_URL en apps/api/.dev.vars'); process.exit(1); }
const sql = postgres(url, { max: 1, onnotice: () => {} });

const b64url = (buf) => Buffer.from(buf).toString('base64url');
function signJwt(claims, secret) {
  const head = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = b64url(JSON.stringify(claims));
  const sig = createHmac('sha256', secret).update(`${head}.${body}`).digest('base64url');
  return `${head}.${body}.${sig}`;
}

try {
  const [exists] = await sql`select name from cms.sites where id = ${site}`;
  if (!exists) throw new Error(`El sitio «${site}» no existe.`);

  if (process.argv.includes('--listar')) {
    const rows = await sql`select id, name, created_at, expires_at, revoked_at, last_used_at from cms.api_tokens where site_id = ${site} order by created_at desc`;
    if (!rows.length) console.log('Ese sitio no tiene tokens.');
    for (const r of rows) {
      const state = r.revoked_at ? 'revocado' : r.expires_at && r.expires_at < new Date() ? 'caducado' : 'activo';
      console.log(`${r.id}  ${state.padEnd(9)} ${r.name}  · último uso: ${r.last_used_at?.toISOString() ?? 'nunca'}`);
    }
  } else if (arg('--revocar')) {
    const id = arg('--revocar');
    const [r] = await sql`update cms.api_tokens set revoked_at = coalesce(revoked_at, now()) where site_id = ${site} and id = ${id} returning id`;
    if (!r) throw new Error(`No existe el token ${id} en el sitio ${site}.`);
    await sql`insert into cms.audit_events (site_id, actor, action, target) values (${site}, 'cli', 'token.revoke', ${id})`;
    console.log(`Token ${id} revocado. Deja de funcionar de inmediato.`);
  } else {
    const secret = env('JWT_SECRET');
    if (!secret || secret.length < 32) throw new Error('Falta JWT_SECRET (mínimo 32 caracteres) en apps/api/.dev.vars.');
    const name = (arg('--nombre') ?? '').trim();
    if (!name || name.length > 80) throw new Error('Indica un nombre de 1–80 caracteres: --nombre "Web de la tienda".');
    const days = arg('--dias') ? Number(arg('--dias')) : undefined;
    if (days !== undefined && !(Number.isInteger(days) && days >= 1 && days <= 3650)) throw new Error('--dias debe ser un entero entre 1 y 3650.');

    const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
    const id = 'tok_' + Array.from(randomBytes(20), (b) => alphabet[b % alphabet.length]).join('');
    const [r] = await sql`insert into cms.api_tokens (id, site_id, name, created_by, expires_at)
      values (${id}, ${site}, ${name}, 'cli', ${days ? sql`now() + make_interval(days => ${days})` : null})
      returning scopes, expires_at`;
    await sql`insert into cms.audit_events (site_id, actor, action, target) values (${site}, 'cli', 'token.create', ${id})`;
    const claims = {
      iss: 'mse-cms', aud: 'mse-cms-api', sub: id, kind: 'project', site, scope: r.scopes,
      iat: Math.floor(Date.now() / 1000),
      ...(r.expires_at ? { exp: Math.floor(r.expires_at.getTime() / 1000) } : {}),
    };
    console.log(`\nToken ${id} para «${site}» (${name}), solo lectura${r.expires_at ? `, caduca ${r.expires_at.toISOString().slice(0, 10)}` : ', sin caducidad'}.`);
    console.log('Cópialo ahora: no se vuelve a mostrar.\n');
    console.log(signJwt(claims, secret));
    console.log('\nÚsalo así:  Authorization: Bearer <token>');
  }
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
} finally {
  await sql.end();
}
