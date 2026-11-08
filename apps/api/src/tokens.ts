import type postgres from 'postgres';
import * as jwt from './jwt';
import { HttpError } from './repo';

type Sql = postgres.Sql;

/** Quién llama con un JWT de proyecto: un sitio y lo que puede hacer en él. */
export interface ProjectToken { id: string; site: string; scopes: string[] }

export interface TokenMeta {
  id: string; site: string; name: string; scopes: string[]; createdBy: string;
  createdAt: string; expiresAt: string | null; revokedAt: string | null; lastUsedAt: string | null;
}

const iso = (v: unknown) => (v instanceof Date ? v.toISOString() : v ? new Date(String(v)).toISOString() : null);
// El Worker conecta con fetch_types: false, así que un text[] puede llegar como el texto '{read}'.
const arr = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : String(v ?? '').replace(/^{|}$/g, '').split(',').filter(Boolean));
const toMeta = (r: Record<string, unknown>): TokenMeta => ({
  id: r.id as string, site: r.site_id as string, name: r.name as string, scopes: arr(r.scopes), createdBy: r.created_by as string,
  createdAt: iso(r.created_at)!, expiresAt: iso(r.expires_at), revokedAt: iso(r.revoked_at), lastUsedAt: iso(r.last_used_at),
});

function newTokenId() {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = crypto.getRandomValues(new Uint8Array(20));
  return 'tok_' + Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
}

function secretOrFail(secret: string | undefined): string {
  try { jwt.assertSecret(secret); return secret; } catch { throw new HttpError(503, 'El API no tiene JWT_SECRET configurado (mínimo 32 caracteres).'); }
}

/** Crea el registro y firma el JWT. El JWT se devuelve una sola vez: no se guarda en ninguna parte. */
export async function createToken(sql: Sql, secret: string | undefined, input: { site: string; name: string; expiresInDays?: number; actor: string }) {
  const key = secretOrFail(secret);
  const id = newTokenId();
  // scopes toma su valor por defecto ('{read}'): hoy no existe otro alcance para proyectos.
  const [r] = await sql`insert into cms.api_tokens (id, site_id, name, created_by, expires_at)
    values (${id}, ${input.site}, ${input.name}, ${input.actor},
      ${input.expiresInDays ? sql`now() + make_interval(days => ${input.expiresInDays})` : null})
    returning *`;
  const meta = toMeta(r);
  const claims: jwt.Claims = {
    iss: jwt.ISSUER, aud: jwt.AUDIENCE, sub: id, kind: 'project', site: input.site, scope: meta.scopes,
    iat: Math.floor(Date.now() / 1000),
    ...(meta.expiresAt ? { exp: Math.floor(new Date(meta.expiresAt).getTime() / 1000) } : {}),
  };
  await sql`insert into cms.audit_events (site_id, actor, action, target) values (${input.site}, ${input.actor}, 'token.create', ${id})`;
  return { ...meta, token: await jwt.sign(claims, key) };
}

export async function listTokens(sql: Sql, site: string) {
  return (await sql`select * from cms.api_tokens where site_id = ${site} order by created_at desc`).map(toMeta);
}

export async function revokeToken(sql: Sql, site: string, id: string, actor: string) {
  const [r] = await sql`update cms.api_tokens set revoked_at = coalesce(revoked_at, now()) where site_id = ${site} and id = ${id} returning id`;
  if (!r) throw new HttpError(404, 'Ese token no existe.');
  await sql`insert into cms.audit_events (site_id, actor, action, target) values (${site}, ${actor}, 'token.revoke', ${id})`;
}

/**
 * Valida un JWT de proyecto: firma y caducidad (sin tocar la base) y luego que el token siga vivo en cms.api_tokens.
 * La base manda sobre las claims: revocar o borrar el sitio invalida el token al instante.
 */
export async function projectFromJwt(sql: Sql, secret: string | undefined, token: string): Promise<ProjectToken | null> {
  const claims = await jwt.verify(token, secretOrFail(secret));
  if (!claims || claims.kind !== 'project') return null;
  const [r] = await sql`update cms.api_tokens set last_used_at = now()
    where id = ${claims.sub} and site_id = ${claims.site} and revoked_at is null and (expires_at is null or expires_at > now())
    returning id, site_id, scopes`;
  return r ? { id: r.id as string, site: r.site_id as string, scopes: arr(r.scopes) } : null;
}
