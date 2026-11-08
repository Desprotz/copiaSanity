// Vista visual aislada: no carga credenciales ni conecta a Neon. Todo se pierde al reiniciar.
import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';

const sites = [
  { id: 'tienda-demo', name: 'Tienda de demostración', publicUrl: 'https://example.com', createdAt: new Date().toISOString() },
  { id: 'bodega-demo', name: 'Bodega de demostración', publicUrl: null, createdAt: new Date().toISOString() },
];
const users = [
  { id: 1, username: 'superdemo', displayName: 'Super Admin de prueba', role: 'super_admin', siteIds: [], disabled: false, createdBy: null },
  { id: 2, username: 'admindemo', displayName: 'Admin de prueba', role: 'admin', siteIds: ['tienda-demo'], disabled: false, createdBy: 1 },
  { id: 3, username: 'duenodemo', displayName: 'Dueño de prueba', role: 'site_owner', siteIds: ['tienda-demo'], disabled: false, createdBy: 2 },
];
const type = { id: 'pagina', name: 'Página', plural: 'Páginas', color: 'blue', titleField: 'titulo', version: 1, fields: [{ key: 'titulo', label: 'Título', kind: 'string', required: true }] };
const preview = {
  name: 'isolated-roles-preview',
  transformIndexHtml(html) {
    return html.replace('<body>', `<body><div style="position:fixed;bottom:0;left:0;right:0;z-index:99999;background:#fff3cd;color:#332701;padding:8px 16px;font:14px system-ui;text-align:center">Vista de demostración · datos temporales · Ver como: <a href="/__preview/role/super_admin">Super Admin</a> · <a href="/__preview/role/admin">Admin</a> · <a href="/__preview/role/site_owner">Dueño</a></div>`);
  },
  configureServer(server) {
    server.middlewares.use(async (req, res, next) => {
      const url = new URL(req.url, 'http://localhost');
      const role = /preview_role=(super_admin|admin|site_owner)/.exec(req.headers.cookie ?? '')?.[1] ?? 'super_admin';
      const me = users.find((u) => u.role === role) ?? users[0];
      if (url.pathname.startsWith('/__preview/role/')) {
        const chosen = url.pathname.split('/').at(-1);
        if (['super_admin', 'admin', 'site_owner'].includes(chosen)) res.setHeader('Set-Cookie', `preview_role=${chosen}; Path=/; SameSite=Strict`);
        res.writeHead(302, { Location: chosen === 'site_owner' ? '/ver-sitio' : '/usuarios' }); res.end(); return;
      }
      if (!url.pathname.startsWith('/api/')) return next();
      const send = (data, status = 200) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(data)); };
      let body = {};
      try { let raw = ''; for await (const chunk of req) { raw += chunk; if (raw.length > 100000) throw new Error('size'); } if (raw) body = JSON.parse(raw); }
      catch { send({ error: 'Datos incorrectos.' }, 400); return; }
      const path = url.pathname.slice('/api/v1'.length);
      const allowed = (id) => me.role === 'super_admin' || me.siteIds.includes(id);
      if (path === '/auth/me' || path === '/auth/login') return send({ ...me, isOwner: me.role === 'super_admin' });
      if (path === '/auth/logout') return send({});
      if (path === '/sites' && req.method === 'GET') return send(sites.filter((s) => allowed(s.id)));
      if (path === '/sites' && req.method === 'POST' && me.role === 'super_admin') {
        const site = { id: body.id, name: body.name, publicUrl: body.publicUrl || null, createdAt: new Date().toISOString() };
        sites.push(site); return send(site, 201);
      }
      if (/^\/sites\/[^/]+$/.test(path) && req.method === 'PATCH') {
        const site = sites.find((s) => s.id === path.split('/')[2] && allowed(s.id));
        if (!site) return send({ error: 'Sin acceso.' }, 403);
        try { if (body.publicUrl) { const u = new URL(body.publicUrl); if (!['http:', 'https:'].includes(u.protocol) || u.username || u.password) throw new Error(); } }
        catch { return send({ error: 'Escribe una dirección http:// o https:// sin credenciales.' }, 400); }
        site.publicUrl = body.publicUrl || null; return send(site);
      }
      if (path.startsWith('/users')) {
        if (me.role === 'site_owner') return send({ error: 'No puedes administrar usuarios.' }, 403);
        const visible = (u) => me.role === 'super_admin' || (u.role === 'site_owner' && u.siteIds.every(allowed));
        if (req.method === 'GET') return send(users.filter(visible));
        if (body.role === 'super_admin' || (me.role === 'admin' && body.role !== undefined && body.role !== 'site_owner') || (body.siteIds !== undefined && !body.siteIds.every(allowed))) return send({ error: 'Permisos insuficientes.' }, 403);
        if (req.method === 'POST') {
          if (users.some((u) => u.username === body.username)) return send({ error: 'Ese usuario ya existe.' }, 409);
          const u = { id: users.length + 1, username: body.username, displayName: body.displayName, role: body.role, siteIds: body.siteIds, disabled: false, createdBy: me.id };
          users.push(u); return send({ id: u.id }, 201);
        }
        const u = users.find((u) => u.id === Number(path.split('/')[2]));
        if (!u || !visible(u) || u.role === 'super_admin' || u.id === me.id) return send({ error: 'Perfil protegido.' }, 403);
        for (const key of ['displayName', 'role', 'siteIds', 'disabled']) if (body[key] !== undefined) u[key] = body[key]; return send({});
      }
      const sitePath = /^\/s\/([^/]+)\/(.*)$/.exec(path);
      if (sitePath && allowed(sitePath[1]) && req.method === 'GET') {
        const part = sitePath[2];
        if (part === 'types') return send([type]);
        if (part === 'documents') return send([]);
        if (part === 'changes') return send({ seq: 1 });
        if (part === 'site/status') return send({ pending: 0, building: false, lastBuiltAt: null, nextBuildAt: null });
        if (part === 'site/snapshot') return send(null);
      }
      if (/\/tokens$/.test(path) && req.method === 'GET') return send([]);
      return send({ error: 'Esta vista previa permite probar Usuarios y la URL del sitio. El resto requiere el API real.' }, 400);
    });
  },
};
const server = await createServer({
  root: fileURLToPath(new URL('.', import.meta.url)),
  define: { 'import.meta.env.VITE_DATA_SOURCE': JSON.stringify('api') },
  plugins: [preview],
  server: { host: '127.0.0.1', port: 5175, strictPort: true },
});
await server.listen();
console.log('Vista aislada de roles: http://127.0.0.1:5175/usuarios');
