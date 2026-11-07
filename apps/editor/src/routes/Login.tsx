import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { TriangleAlert } from 'lucide-react';

export interface Me { id: number; username: string; displayName: string; isOwner: boolean }
interface AuthValue { me: Me; logout: () => Promise<void> }
const AuthContext = createContext<AuthValue | null>(null);
export const useAuth = () => useContext(AuthContext);

const post = (path: string, body?: unknown) => fetch(`/api/v1/auth/${path}`, {
  method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json', 'x-cms': '1' }, body: body ? JSON.stringify(body) : undefined,
});

/** Muestra el inicio de sesión hasta que haya una sesión válida. Si una sesión caduca a mitad de trabajo, vuelve aquí. */
export function AuthGate({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Me | null | undefined>(undefined);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch('/api/v1/auth/me', { credentials: 'same-origin' })
      .then(async (r) => setMe(r.ok ? ((await r.json()) as Me) : null))
      .catch(() => { setMe(null); setError('Sin conexión con el servidor. ¿Está corriendo el API?'); });
    const expired = () => setMe(null);
    window.addEventListener('cms:session-expired', expired);
    return () => window.removeEventListener('cms:session-expired', expired);
  }, []);

  const submit = async () => {
    setError(''); setBusy(true);
    try {
      const r = await post('login', { username, password });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) { setError(body.error ?? 'No se pudo iniciar sesión.'); return; }
      setPassword(''); setMe(body as Me);
    } catch { setError('Sin conexión con el servidor.'); }
    finally { setBusy(false); }
  };

  if (me === undefined) return <div className="empty" style={{ paddingTop: 96 }} aria-busy="true"><span className="spinner" aria-hidden="true" /></div>;
  if (me) return <AuthContext.Provider value={{ me, logout: async () => { await post('logout'); setMe(null); } }}>{children}</AuthContext.Provider>;

  return (
    <main className="login">
      <form className="login-card" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
        <img className="login-logo" src="/logo-mse.svg" alt="MSE" width={110} height={30} />
        <h1>Inicia sesión</h1>
        <p className="muted">Entra para editar tus sitios.</p>
        <div className="field">
          <label htmlFor="u">Usuario</label>
          <div className="control"><input id="u" autoComplete="username" autoCapitalize="none" spellCheck={false} value={username} onChange={(e) => setUsername(e.target.value)} autoFocus /></div>
        </div>
        <div className="field">
          <label htmlFor="p">Contraseña</label>
          <div className="control"><input id="p" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
        </div>
        {error && <p className="err" role="alert"><TriangleAlert className="lucide" aria-hidden="true" />{error}</p>}
        <button className="btn btn-primary" type="submit" disabled={busy || !username || !password} style={{ width: '100%', height: 44 }}>
          {busy ? <span className="spinner" aria-hidden="true" /> : null}Entrar
        </button>
      </form>
    </main>
  );
}
