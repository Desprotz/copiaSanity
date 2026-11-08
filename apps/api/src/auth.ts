import type postgres from 'postgres';
import { HttpError } from './repo';
import type { Role } from './permissions';

type Sql = postgres.Sql;

// Contraseñas con bcrypt (pgcrypto) calculado dentro de Postgres: así el Worker no gasta su CPU (10 ms en el plan gratuito).
export const SESSION_DAYS = 14;
export const COOKIE = 'cms_session';
const MAX_FAILS = 5;
const WINDOW_MIN = 15;

const enc = new TextEncoder();
const b64 = (u: Uint8Array) => btoa(String.fromCharCode(...u));

const sha256 = async (s: string) => b64(new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(s))));

export interface SessionUser { id: number; username: string; displayName: string; role: Role; isOwner: boolean }

export async function login(sql: Sql, username: string, password: string, ip: string) {
  const [{ fails }] = await sql`select count(*)::int as fails from cms.login_attempts
    where not ok and at > now() - make_interval(mins => ${WINDOW_MIN}) and (username = ${username} or ip = ${ip})`;
  if (fails >= MAX_FAILS) throw new HttpError(429, `Demasiados intentos fallidos. Espera ${WINDOW_MIN} minutos e inténtalo de nuevo.`);

  const [u] = await sql`select id, (password_hash = crypt(${password}, password_hash)) as ok
    from cms.users where username = ${username} and disabled_at is null and password_hash like '$2%'`;
  // Si el usuario no existe se calcula igual un bcrypt, para que la respuesta tarde lo mismo y no revele qué usuarios existen.
  if (!u) await sql`select crypt(${password}, gen_salt('bf', 12))`;
  const ok = Boolean(u?.ok);
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
    returning u.id, u.username, u.display_name, u.role`;
  return r ? { id: Number(r.id), username: r.username as string, displayName: r.display_name as string, role: r.role as Role, isOwner: r.role === 'super_admin' } : null;
}

export async function logout(sql: Sql, token: string | undefined) {
  if (token) await sql`delete from cms.sessions where token_hash = ${await sha256(token)}`;
}

/** Solo Super Admin tiene acceso global. Admin y dueño necesitan asignación explícita. */
export async function canUseSite(sql: Sql, user: SessionUser, site: string) {
  if (user.role === 'super_admin') return true;
  const [r] = await sql`select 1 from cms.site_members where user_id = ${user.id} and site_id = ${site}`;
  return Boolean(r);
}
