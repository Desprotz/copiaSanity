import { useEffect, useState } from 'react';
import { sitesApi, usersApi, type UserProfile } from '../data/api-store';
import type { Site } from '../data/types';
import { useAuth } from './Login';
import { useToast } from '../components/ui';
import { Link } from 'react-router';

export function AssignmentsPage() {
  const auth = useAuth();
  const allowed = Boolean(auth && auth.me.role !== 'site_owner');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [selected, setSelected] = useState('');
  const [assigned, setAssigned] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  useEffect(() => {
    if (!allowed) return;
    let live = true;
    Promise.all([usersApi.list(), sitesApi.list()]).then(([u, s]) => { if (live) { setUsers(u.filter((p) => p.role !== 'super_admin' && p.id !== auth?.me.id)); setSites(s); } }).catch((e) => { if (live) setError(e.message); }).finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [allowed, auth?.me.id]);
  const user = users.find((u) => String(u.id) === selected);
  if (!allowed) return <main className="page"><h1>Asignar proyectos</h1><p>Solo los administradores pueden vincular usuarios.</p></main>;
  return <main className="page" id="main"><div className="page-inner"><h1>Asignar proyectos</h1><p className="lead">Vincula una cuenta existente con sus proyectos. Los usuarios se crean por separado en <Link to="/usuarios">Usuarios</Link>.</p>
    <section className="panel"><form onSubmit={async (e) => {
      e.preventDefault(); if (!user || user.role === 'super_admin') return;
      setBusy(true); setError('');
      try { await usersApi.update(user.id, { siteIds: assigned }); setUsers((all) => all.map((u) => u.id === user.id ? { ...u, siteIds: assigned } : u)); toast('Proyectos vinculados. Las sesiones anteriores del usuario se cerraron.'); }
      catch (e) { setError((e as Error).message); } finally { setBusy(false); }
    }}>
      <div className="field"><label htmlFor="assign-user">Usuario existente</label><div className="control"><select id="assign-user" value={selected} disabled={loading || busy} required onChange={(e) => { setSelected(e.target.value); setAssigned(users.find((u) => String(u.id) === e.target.value)?.siteIds ?? []); }}><option value="">Selecciona una persona</option>{users.map((u) => <option key={u.id} value={u.id}>{u.displayName} ({u.username}) · {u.role === 'admin' ? 'Admin' : 'Dueño del sitio'}</option>)}</select></div></div>
      {loading && <p role="status">Cargando usuarios y proyectos…</p>}
      {user && <fieldset className="profile-sites" disabled={busy}><legend>Proyectos de {user.displayName}</legend>{sites.map((s) => <label key={s.id}><input type="checkbox" checked={assigned.includes(s.id)} onChange={(e) => setAssigned(e.target.checked ? [...assigned, s.id] : assigned.filter((id) => id !== s.id))} />{s.name}</label>)}{!sites.length && <p>No tienes proyectos disponibles para asignar.</p>}<p className="help">Sin proyectos vinculados, esta cuenta no podrá acceder al contenido de ningún sitio.</p></fieldset>}
      {error && <p className="err" role="alert">{error}</p>}
      {!loading && !users.length && <p>Crea primero un perfil en Usuarios.</p>}
      <div className="acts"><button className="btn btn-primary" disabled={!user || busy || loading}>{busy ? 'Guardando…' : 'Guardar asignaciones'}</button></div>
    </form></section>
  </div></main>;
}
