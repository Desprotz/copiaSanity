// Pruebas HTTP del Worker real con un adaptador SQL en memoria. Nunca conectan a Neon.
import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/index.ts';
import { canManageProfile, canCreateRole, validPublicUrl } from '../src/permissions.ts';

function fixture(role = 'admin') {
  const actor = { id: 1, username: 'operator', display_name: 'Operator', role };
  const state = {
    users: [actor, { id: 2, username: 'client', display_name: 'Client', role: 'site_owner', created_by: 1 },
      { id: 3, username: 'other', display_name: 'Other', role: 'site_owner', created_by: 9 },
      { id: 4, username: 'root', display_name: 'Root', role: 'super_admin' }],
    members: [{ user_id: 1, site_id: 'alpha' }, { user_id: 2, site_id: 'alpha' }, { user_id: 3, site_id: 'beta' }],
    sites: [{ id: 'alpha', name: 'Alpha', created_at: new Date(), public_url: null }, { id: 'beta', name: 'Beta', created_at: new Date(), public_url: null }],
    audit: [], sessionsClosed: [],
  };
  const sql = async (strings, ...v) => {
    const q = strings.join('?').replace(/\s+/g, ' ').trim();
    if (q.startsWith('update cms.sessions')) return actor.disabled_at ? [] : [actor];
    if (q.startsWith('lock table')) return [];
    if (q === 'select role from cms.users where id = ? and disabled_at is null') return state.users.filter((u) => u.id === v[0] && !u.disabled_at);
    if (q.startsWith('select id, username, display_name')) return state.users;
    if (q === 'select user_id, site_id from cms.site_members') return state.members;
    if (q.startsWith('select site_id from cms.site_members')) return state.members.filter((m) => m.user_id === v[0]);
    if (q.startsWith('select 1 from cms.site_members')) return state.members.filter((m) => m.user_id === v[0] && m.site_id === v[1]);
    if (q === 'select id from cms.users where username = ?') return state.users.filter((u) => u.username === v[0]);
    if (q === 'select id from cms.sites' || q.startsWith('select * from cms.sites')) return state.sites;
    if (q.startsWith('select 1 from cms.sites')) return state.sites.filter((s) => s.id === v[0]);
    if (q.startsWith('insert into cms.users')) { const u = { id: 10, username: v[0], display_name: v[1], role: v[3], created_by: v[4] }; state.users.push(u); return [u]; }
    if (q.startsWith('delete from cms.site_members')) { state.members = state.members.filter((m) => m.user_id !== v[0]); return []; }
    if (q.startsWith('insert into cms.site_members')) { state.members.push({ user_id: v[0], site_id: v[1] }); return []; }
    if (q.startsWith('insert into cms.audit_events')) { state.audit.push(v); return []; }
    if (q.startsWith('delete from cms.sessions')) { state.sessionsClosed.push(v[0]); return []; }
    if (q.startsWith('update cms.users')) { const u = state.users.find((u) => u.id === v[3]); Object.assign(u, { display_name: v[0], role: v[1], disabled_at: v[2] }); return []; }
    if (q.startsWith('coalesce(disabled_at')) return new Date();
    if (q.startsWith('update cms.sites set public_url')) { const s = state.sites.find((s) => s.id === v[1]); if (!s) return []; s.public_url = v[0]; return [s]; }
    if (q.startsWith('select * from cms.api_tokens')) return [];
    throw new Error(`Consulta sin simular: ${q}`);
  };
  sql.begin = async (fn) => {
    const before = structuredClone(state);
    try { return await fn(sql); } catch (e) { Object.assign(state, before); throw e; }
  };
  sql.end = async () => {};
  sql.json = (v) => v;
  globalThis.__accessTestSql = sql;
  const request = (path, method = 'GET', body, extra = {}) => worker.fetch(new Request(`https://cms.test/api/v1${path}`, {
    method, headers: { cookie: 'cms_session=test-session', 'x-cms': '1', 'content-type': 'application/json', ...extra },
    ...(body === undefined ? {} : { body: JSON.stringify(path === '/users' && method === 'POST' ? { username: 'newclient', password: 'test-password-only', ...body } : body) }),
  }), { DATABASE_URL: 'isolated-test-only' }, { waitUntil: () => {} });
  return { state, actor, request };
}
const profile = { displayName: 'Client', role: 'site_owner', siteIds: ['alpha'], disabled: false };

test('Cambiar asignaciones conserva nombre, rol y estado actuales', async () => {
  const { request, state } = fixture('super_admin');
  state.users[1].display_name = 'Nombre actualizado en otra pestaña';
  state.users[1].role = 'admin';
  state.users[1].disabled_at = new Date();
  assert.equal((await request('/users/2', 'PATCH', { siteIds: ['beta'] })).status, 204);
  assert.equal(state.users[1].display_name, 'Nombre actualizado en otra pestaña');
  assert.equal(state.users[1].role, 'admin');
  assert.ok(state.users[1].disabled_at);
});
test('Editar perfil conserva proyectos vinculados desde otra pantalla', async () => {
  const { request, state } = fixture('super_admin');
  state.members.push({ user_id: 2, site_id: 'beta' });
  assert.equal((await request('/users/2', 'PATCH', { displayName: 'Nombre nuevo' })).status, 204);
  assert.deepEqual(state.members.filter((m) => m.user_id === 2).map((m) => m.site_id), ['alpha', 'beta']);
});
test('Creación sin proyecto y vinculación posterior', async () => {
  const { request, state } = fixture();
  assert.equal((await request('/users', 'POST', { ...profile, siteIds: [] })).status, 201);
  assert.equal(state.members.filter((m) => m.user_id === 10).length, 0);
  assert.ok((await (await request('/users')).json()).some((u) => u.id === 10));
  assert.equal((await request('/users/10', 'PATCH', { siteIds: ['alpha'] })).status, 204);
  assert.ok(state.members.some((m) => m.user_id === 10 && m.site_id === 'alpha'));
});

test('Admin ve únicamente sus sitios y perfiles dentro de su ámbito', async () => {
  const { request } = fixture();
  assert.deepEqual((await (await request('/sites')).json()).map((s) => s.id), ['alpha']);
  assert.deepEqual((await (await request('/users')).json()).map((u) => u.id), [2]);
});
test('Admin crea dueño en su sitio con auditoría y asignación', async () => {
  const { request, state } = fixture();
  assert.equal((await request('/users', 'POST', profile)).status, 201);
  assert.ok(state.members.some((m) => m.user_id === 10 && m.site_id === 'alpha'));
  assert.equal(state.audit.length, 1);
});
test('Admin no crea Admins ni Super Admins', async () => {
  const { request, state } = fixture();
  assert.equal((await request('/users', 'POST', { ...profile, role: 'admin' })).status, 403);
  assert.equal((await request('/users', 'POST', { ...profile, role: 'super_admin' })).status, 400);
  assert.equal(state.users.length, 4);
});
test('Super Admin crea Admin y le asigna otro sitio', async () => {
  const { request, state } = fixture('super_admin');
  assert.equal((await request('/users', 'POST', { ...profile, role: 'admin', siteIds: ['beta'] })).status, 201);
  assert.equal(state.users.at(-1).role, 'admin');
  assert.ok(state.members.some((m) => m.user_id === 10 && m.site_id === 'beta'));
});
test('Admin no asigna sitios ajenos al crear o editar', async () => {
  const { request, state } = fixture();
  assert.equal((await request('/users', 'POST', { ...profile, siteIds: ['beta'] })).status, 403);
  assert.equal((await request('/users/2', 'PATCH', { ...profile, siteIds: ['beta'] })).status, 403);
  assert.ok(state.members.some((m) => m.user_id === 2 && m.site_id === 'alpha'));
});
test('Admin no puede elevarse ni editar perfiles ajenos ni al Super Admin', async () => {
  const { request } = fixture();
  for (const id of [1, 3, 4]) assert.equal((await request(`/users/${id}`, 'PATCH', profile)).status, 403);
  assert.equal((await request('/users/2', 'PATCH', { ...profile, role: 'admin' })).status, 403);
});
test('Actualizar asignaciones cierra las sesiones existentes', async () => {
  const { request, state } = fixture('super_admin');
  assert.equal((await request('/users/2', 'PATCH', { ...profile, siteIds: ['beta'] })).status, 204);
  assert.deepEqual(state.members.filter((m) => m.user_id === 2).map((m) => m.site_id), ['beta']);
  assert.deepEqual(state.sessionsClosed, [2]);
});
test('Ningún perfil Super Admin se puede desactivar desde la API', async () => {
  const { request } = fixture('super_admin');
  assert.equal((await request('/users/4', 'PATCH', { ...profile, disabled: true })).status, 403);
});
test('Dueño no lista, crea ni modifica perfiles', async () => {
  const { request } = fixture('site_owner');
  assert.equal((await request('/users')).status, 403);
  assert.equal((await request('/users', 'POST', profile)).status, 403);
  assert.equal((await request('/users/2', 'PATCH', profile)).status, 403);
});
test('Admin no crea ni elimina sitios', async () => {
  const { request } = fixture();
  assert.equal((await request('/sites', 'POST', { id: 'gamma', name: 'Gamma' })).status, 403);
  assert.equal((await request('/sites/alpha', 'DELETE', { confirm: 'Alpha' })).status, 403);
});
test('Dueño cambia y elimina la URL de su sitio, nunca la de otro', async () => {
  const { request, state } = fixture('site_owner');
  assert.equal((await request('/sites/alpha', 'PATCH', { publicUrl: 'https://example.com/store' })).status, 200);
  assert.equal(state.sites[0].public_url, 'https://example.com/store');
  assert.equal((await request('/sites/beta', 'PATCH', { publicUrl: 'https://example.com' })).status, 404);
  assert.equal((await request('/sites/alpha', 'PATCH', { publicUrl: '' })).status, 200);
  assert.equal(state.sites[0].public_url, null);
});
test('URL rechaza javascript, data, relativas y credenciales', async () => {
  const { request } = fixture();
  for (const publicUrl of ['javascript:alert(1)', 'data:text/html,test', '/relative', 'https://user:pass@example.com']) {
    assert.equal((await request('/sites/alpha', 'PATCH', { publicUrl })).status, 400);
  }
  assert.equal(validPublicUrl('http://localhost:3000'), true);
});
test('Tokens limitados: Admin solo su sitio, dueño ninguno', async () => {
  let f = fixture();
  assert.equal((await f.request('/sites/alpha/tokens')).status, 200);
  assert.equal((await f.request('/sites/beta/tokens')).status, 404);
  f = fixture('site_owner');
  assert.equal((await f.request('/sites/alpha/tokens')).status, 403);
});
test('Un JWT de proyecto nunca llega a las rutas de usuarios', async () => {
  const { request } = fixture();
  assert.equal((await request('/users', 'GET', undefined, { authorization: 'Bearer aaa.bbb.ccc' })).status, 403);
});
test('Sesión ausente o desactivada y protección CSRF', async () => {
  const { request, actor } = fixture();
  assert.equal((await request('/users', 'GET', undefined, { cookie: '' })).status, 401);
  assert.equal((await request('/users', 'POST', profile, { 'x-cms': '' })).status, 403);
  actor.disabled_at = new Date();
  assert.equal((await request('/users')).status, 401);
});
test('Contraseña, usuario y sitios duplicados se validan en el servidor', async () => {
  const { request } = fixture();
  for (const input of [{ password: 'short' }, { password: 'ñ'.repeat(40) }, { username: 'bad name' }, { siteIds: ['alpha', 'alpha'] }]) {
    assert.equal((await request('/users', 'POST', { ...profile, ...input })).status, 400);
  }
  assert.equal((await request('/users', 'POST', { ...profile, username: 'client' })).status, 409);
});
test('Cuenta compartida fuera del ámbito y dueño sin sitios de otro Admin quedan protegidos', () => {
  const actor = { id: 1, role: 'admin' };
  const target = { id: 2, role: 'site_owner', createdBy: 9, siteIds: ['alpha', 'beta'] };
  assert.equal(canManageProfile(actor, target, ['alpha']), false);
  assert.equal(canManageProfile(actor, { ...target, siteIds: [] }, ['alpha']), false);
  assert.equal(canManageProfile(actor, { ...target, siteIds: [], createdBy: 1 }, ['alpha']), true);
  assert.equal(canCreateRole('site_owner', 'site_owner'), false);
});
