import type postgres from 'postgres';
import { HttpError } from './repo';
import type { SessionUser } from './auth';
import { canCreateRole, canManageProfile, canManageUsers, type Role } from './permissions';

type Db = postgres.Sql | postgres.TransactionSql;
export interface Profile { id: number; username: string; displayName: string; role: Role; disabled: boolean; createdBy: number | null; siteIds: string[] }
export interface ProfileInput { displayName: string; role: 'admin' | 'site_owner'; siteIds: string[]; disabled: boolean }
async function profiles(db: Db): Promise<Profile[]> {
  const rows = await db`select id, username, display_name, role, disabled_at, created_by from cms.users order by username`;
  const members = await db`select user_id, site_id from cms.site_members`;
  return rows.map((r) => ({ id: Number(r.id), username: String(r.username), displayName: String(r.display_name), role: r.role as Role,
    disabled: Boolean(r.disabled_at), createdBy: r.created_by ? Number(r.created_by) : null,
    siteIds: members.filter((m) => Number(m.user_id) === Number(r.id)).map((m) => String(m.site_id)) }));
}
async function assigned(db: Db, id: number) { return (await db`select site_id from cms.site_members where user_id = ${id}`).map((r) => String(r.site_id)); }
export async function listUsers(db: Db, actor: SessionUser) {
  if (!canManageUsers(actor.role)) throw new HttpError(403, 'No puedes administrar usuarios.');
  const own = await assigned(db, actor.id);
  return (await profiles(db)).filter((u) => actor.role === 'super_admin' || canManageProfile(actor, u, own));
}
async function checkSites(db: Db, actor: SessionUser, siteIds: string[]) {
  const allowed = actor.role === 'super_admin'
    ? (await db`select id from cms.sites`).map((s) => String(s.id)) : await assigned(db, actor.id);
  if (!siteIds.every((id) => allowed.includes(id))) throw new HttpError(403, 'Solo puedes asignar sitios que administras.');
}
async function membership(db: Db, id: number, siteIds: string[]) {
  await db`delete from cms.site_members where user_id = ${id}`;
  for (const site of siteIds) await db`insert into cms.site_members (user_id, site_id, role) values (${id}, ${site}, 'editor')`;
}
async function audit(db: Db, actor: SessionUser, action: string, id: number) {
  await db`insert into cms.audit_events (site_id, actor, action, target) values (null, ${actor.username}, ${action}, ${String(id)})`;
}
/** Serializa cambios de permisos y vuelve a leer el actor: evita elevaciones por peticiones concurrentes. */
async function currentActor(tx: postgres.TransactionSql, actor: SessionUser): Promise<SessionUser> {
  await tx`lock table cms.users, cms.site_members in share row exclusive mode`;
  const [u] = await tx`select role from cms.users where id = ${actor.id} and disabled_at is null`;
  if (!u || !canManageUsers(u.role as Role)) throw new HttpError(403, 'No puedes administrar usuarios.');
  return { ...actor, role: u.role as Role, isOwner: u.role === 'super_admin' };
}
export async function createUser(sql: postgres.Sql, actor: SessionUser, input: ProfileInput & { username: string; password: string }) {
  return sql.begin(async (tx) => {
    const current = await currentActor(tx, actor);
    if (!canCreateRole(current.role, input.role)) throw new HttpError(403, 'Solo el Super Admin puede crear Admins.');
    await checkSites(tx, current, input.siteIds);
    if ((await tx`select id from cms.users where username = ${input.username}`).length) throw new HttpError(409, 'Ese nombre de usuario ya existe.');
    const [u] = await tx`insert into cms.users (username, display_name, password_hash, role, is_owner, created_by)
      values (${input.username}, ${input.displayName}, crypt(${input.password}, gen_salt('bf', 12)), ${input.role}, false, ${current.id}) returning id`;
    const id = Number(u.id);
    await membership(tx, id, input.siteIds);
    await audit(tx, current, 'user.create', id);
    return { id };
  });
}
export async function updateUser(sql: postgres.Sql, actor: SessionUser, id: number, input: Partial<ProfileInput>) {
  await sql.begin(async (tx) => {
    const current = await currentActor(tx, actor);
    const target = (await profiles(tx)).find((u) => u.id === id);
    if (!target || !canManageProfile(current, target, await assigned(tx, current.id))) throw new HttpError(403, 'No puedes modificar este perfil.');
    const next = { displayName: target.displayName, role: target.role, disabled: target.disabled, ...input };
    if (!canCreateRole(current.role, next.role)) throw new HttpError(403, 'Solo el Super Admin puede asignar el rol Admin.');
    if (input.siteIds !== undefined) await checkSites(tx, current, input.siteIds);
    await tx`update cms.users set display_name = ${next.displayName}, role = ${next.role},
      disabled_at = ${next.disabled ? tx`coalesce(disabled_at, now())` : null} where id = ${id}`;
    if (input.siteIds !== undefined) await membership(tx, id, input.siteIds);
    await tx`delete from cms.sessions where user_id = ${id}`;
    await audit(tx, current, 'user.update', id);
  });
}
