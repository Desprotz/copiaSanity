import type postgres from 'postgres';
import { HttpError } from './repo';

type Sql = postgres.Sql;

// Formato del hash: pbkdf2-sha256$<iteraciones>$<sal base64>$<hash base64>. Lo genera scripts/create-user.mjs con los mismos parámetros.
const ITERATIONS = 100_000; // máximo que admite WebCrypto en Workers
export const SESSION_DAYS = 14;
export const COOKIE = 'cms_session';
const MAX_FAILS = 5;
const WINDOW_MIN = 15;

const enc = new TextEncoder();
const b64 = (u: Uint8Array) => btoa(String.fromCharCode(...u));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function pbkdf2(password: string, salt: Uint8Array, iterations: number) {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256));
}

function sameBytes(a: Uint8Array, b: Uint8Array) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a[i] ^ b[i];
  return d === 0;
}

export async function verifyPassword(password: string, stored: string) {
  const [alg, iter, salt, hash] = stored.split('$');
  if (alg !== 'pbkdf2-sha256' || !iter || !salt || !hash) return false;
  const n = Number(iter);
  if (!Number.isInteger(n) || n < 10_000 || n > ITERATIONS) return false;
  return sameBytes(await pbkdf2(password, unb64(salt), n), unb64(hash));
}

/** Hash ficticio para que un usuario inexistente tarde lo mismo que uno real (no revela qué usuarios existen). */
const DUMMY = `pbkdf2-sha256$${ITERATIONS}$${b64(new Uint8Array(16))}$${b64(new Uint8Array(32))}`;

const sha256 = async (s: string) => b64(new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(s))));

export interface SessionUser { id: number; username: string; displayName: string; isOwner: boolean }

export async function login(sql: Sql, username: string, password: string, ip: string) {
  const [{ fails }] = await sql`select count(*)::int as fails from cms.login_attempts
    where not ok and at > now() - make_interval(mins => ${WINDOW_MIN}) and (username = ${username} or ip = ${ip})`;
  if (fails >= MAX_FAILS) throw new HttpError(429, `Demasiados intentos fallidos. Espera ${WINDOW_MIN} minutos e inténtalo de nuevo.`);

  const [u] = await sql`select * from cms.users where username = ${username} and disabled_at is null`;
  const ok = await verifyPassword(password, (u?.password_hash as string) ?? DUMMY) && Boolean(u);
  await sql`insert into cms.login_attempts (username, ip, ok) values (${username}, ${ip}, ${ok})`;
  await sql`delete from cms.login_attempts where at < now() - interval '7 days'`;
  if (!ok) throw new HttpError(401, 'Usuario o contraseña incorrectos.');

  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const token = b64(bytes).replace(/[+/=]/g, (c) => ({ '+': '-', '/': '_', '=': '' })[c]!);
  await sql`insert into cms.sessions (token_hash, user_id, expires_at) values (${await sha256(token)}, ${u.id as number}, now() + make_interval(days => ${SESSION_DAYS}))`;
  await sql`delete from cms.sessions where expires_at < now()`;
  return token;
}

export async function sessionUser(sql: Sql, token: string | undefined): Promise<SessionUser | null> {
  if (!token || token.length > 100) return null;
  const [r] = await sql`update cms.sessions s set last_seen_at = now() from cms.users u
    where s.token_hash = ${await sha256(token)} and s.expires_at > now() and u.id = s.user_id and u.disabled_at is null
    returning u.id, u.username, u.display_name, u.is_owner`;
  return r ? { id: Number(r.id), username: r.username as string, displayName: r.display_name as string, isOwner: r.is_owner as boolean } : null;
}

export async function logout(sql: Sql, token: string | undefined) {
  if (token) await sql`delete from cms.sessions where token_hash = ${await sha256(token)}`;
}

/** El dueño entra a todos los sitios; cualquier otra persona, solo a los que tenga asignados. */
export async function canUseSite(sql: Sql, user: SessionUser, site: string) {
  if (user.isOwner) return true;
  const [r] = await sql`select 1 from cms.site_members where user_id = ${user.id} and site_id = ${site}`;
  return Boolean(r);
}
