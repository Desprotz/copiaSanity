export type Role = 'super_admin' | 'admin' | 'site_owner';
export const canManageUsers = (role: Role) => role === 'super_admin' || role === 'admin';
export const canCreateRole = (actor: Role, target: Role) =>
  (actor === 'super_admin' && target !== 'super_admin') || (actor === 'admin' && target === 'site_owner');

/** Un Admin nunca modifica una cuenta que también tenga acceso fuera de su ámbito. */
export function canManageProfile(actor: { id: number; role: Role }, target: { id: number; role: Role; createdBy: number | null; siteIds: string[] }, assigned: string[]) {
  if (actor.id === target.id || target.role === 'super_admin') return false;
  if (actor.role === 'super_admin') return true;
  return actor.role === 'admin' && target.role === 'site_owner'
    && (target.siteIds.length > 0 || target.createdBy === actor.id)
    && target.siteIds.every((id) => assigned.includes(id));
}

export function validPublicUrl(value: string): boolean {
  if (value === '') return true;
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) && Boolean(url.hostname) && !url.username && !url.password;
  } catch { return false; }
}
