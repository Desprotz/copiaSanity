import { useCallback, useEffect, useState } from 'react';
import { usersApi, type UserInput, type UserProfile } from '../data/api-store';
import { Link } from 'react-router';
import { useAuth } from './Login';
import { useToast } from '../components/ui';

const labels = { super_admin: 'Super Admin', admin: 'Admin', site_owner: 'Dueño del sitio' };
const blank = (): UserInput => ({ displayName: '', role: 'site_owner', siteIds: [], disabled: false });
export function UsersPage() {
  const auth = useAuth();
  const toast = useToast();
  const allowed = auth?.me.role === 'super_admin' || auth?.me.role === 'admin';
  const superAdmin = auth?.me.role === 'super_admin';
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<UserProfile | null>(null);
  const [form, setForm] = useState<UserInput>(blank);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const load = useCallback(async () => {
    if (!allowed) return;
    setLoading(true); setLoadError('');
    try { setUsers(await usersApi.list()); } catch (e) { setLoadError((e as Error).message); } finally { setLoading(false); }
  }, [allowed]);
  useEffect(() => { void load(); }, [load]);
  const reset = () => { setEditing(null); setForm(blank()); setUsername(''); setPassword(''); setConfirm(''); setError(''); };
  if (!allowed) return <main className="page" id="main"><div className="page-inner"><h1>Usuarios</h1><p>Solo los administradores pueden gestionar perfiles.</p></div></main>;
  return <main className="page" id="main"><div className="page-inner">
    <h1>Usuarios y roles</h1>
    <p className="lead">Crea las cuentas del CMS aquí. Después podrás vincularlas a sus proyectos desde <Link to="/asignaciones">Asignar proyectos</Link>.</p>
    <section className="panel"><h2>{editing ? `Editar a ${editing.username}` : 'Crear perfil'}</h2>
      <form onSubmit={async (e) => {
        e.preventDefault(); setError('');
        if (!editing && password !== confirm) { setError('Las contraseñas no coinciden.'); return; }
        setBusy(true);
        try {
          if (editing) await usersApi.update(editing.id, { displayName: form.displayName, role: form.role, disabled: form.disabled });
          else await usersApi.create({ ...form, username, password });
          toast(editing ? 'Perfil actualizado. Sus sesiones anteriores se cerraron.' : 'Cuenta creada sin proyectos. Puedes vincularla desde Asignar proyectos.');
          reset(); await load();
        } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
      }}>
        <fieldset className="profile-fields" disabled={busy}>
          <div className="field"><label htmlFor="profile-name">Nombre</label><div className="control"><input id="profile-name" required maxLength={80} value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} /></div></div>
          {!editing && <><div className="field"><label htmlFor="profile-username">Usuario</label><div className="control"><input id="profile-username" required pattern="[a-z0-9._-]{3,40}" autoComplete="off" autoCapitalize="none" value={username} onChange={(e) => setUsername(e.target.value.toLowerCase())} /></div><span className="help">3–40 caracteres: letras sin tildes, números, punto o guion.</span></div>
            <div className="field"><label htmlFor="profile-password">Contraseña inicial</label><div className="control"><input id="profile-password" type="password" required minLength={10} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} /></div><span className="help">Mínimo 10 caracteres; máximo 72 bytes. Entrégala a la persona por un canal privado.</span></div>
            <div className="field"><label htmlFor="profile-confirm">Repetir contraseña</label><div className="control"><input id="profile-confirm" type="password" required autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} /></div></div></>}
          <div className="field"><label htmlFor="profile-role">Rol</label><div className="control"><select id="profile-role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as UserInput['role'] })}><option value="site_owner">Dueño del sitio</option>{superAdmin && <option value="admin">Admin</option>}</select></div></div>
          {!editing && <p className="help">La cuenta se creará sin proyectos vinculados.</p>}
          {editing && <label className="profile-check"><input type="checkbox" checked={form.disabled} onChange={(e) => setForm({ ...form, disabled: e.target.checked })} />Desactivar este perfil</label>}
        </fieldset>
        {error && <p className="err" role="alert">{error}</p>}
        <div className="acts">{editing && <button className="btn btn-ghost" type="button" disabled={busy} onClick={reset}>Cancelar edición</button>}<button className="btn btn-primary" type="submit" disabled={busy}>{busy ? 'Guardando…' : editing ? 'Guardar perfil' : 'Crear perfil'}</button></div>
      </form>
    </section>
    <section className="panel"><h2>Perfiles</h2>
      {loading && <p role="status">Cargando perfiles…</p>}
      {loadError && <p className="err" role="alert">{loadError} <button className="btn btn-ghost" onClick={() => void load()}>Reintentar</button></p>}
      {!loading && !loadError && users.length === 0 && <p>No hay perfiles que puedas administrar.</p>}
      <ul className="tok-list">{users.map((u) => <li className="tok-row" key={u.id}>
        <div className="tok-main"><strong>{u.displayName}</strong><span className="muted">{u.username} · {labels[u.role]} · {u.disabled ? 'Desactivado' : 'Activo'}</span></div>
        {u.role !== 'super_admin' && u.id !== auth?.me.id && <button className="btn btn-secondary" disabled={busy} onClick={() => { setEditing(u); setForm({ displayName: u.displayName, role: u.role as UserInput['role'], siteIds: u.siteIds, disabled: u.disabled }); setPassword(''); setConfirm(''); setError(''); window.scrollTo({ top: 0, behavior: 'smooth' }); document.getElementById('profile-name')?.focus(); }}>Editar</button>}
      </li>)}</ul>
      <p className="help">Los Super Admin están protegidos: esta pantalla no permite desactivarlos ni cambiarles el rol.{!superAdmin && ' Los perfiles compartidos con sitios fuera de tu ámbito los administra el Super Admin.'}</p>
    </section>
  </div></main>;
}
