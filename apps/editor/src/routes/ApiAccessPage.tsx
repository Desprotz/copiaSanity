import { Check, Copy, KeyRound, TriangleAlert } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Dialog, Heading, Modal, ModalOverlay } from 'react-aria-components';
import { tokensApi, type ApiToken } from '../data/api-store';
import { useSites } from '../data/sites';
import { useToast } from '../components/ui';
import { useAuth } from './Login';

// Tokens de API por sitio: el Super Admin o Admin asignado los crea para que la web del cliente
// consulte su contenido publicado con Authorization: Bearer, sin usuario ni contraseña.

const EXPIRY = [
  { value: '365', label: '1 año' },
  { value: '90', label: '90 días' },
  { value: '30', label: '30 días' },
  { value: '', label: 'Sin caducidad' },
];

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
const fmtWhen = (iso: string) => new Date(iso).toLocaleString('es-CO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false });

function stateOf(t: ApiToken): { label: string; cls: string; active: boolean } {
  if (t.revokedAt) return { label: 'Revocado', cls: 's-draft', active: false };
  if (t.expiresAt && new Date(t.expiresAt) <= new Date()) return { label: 'Caducado', cls: 's-draft', active: false };
  return { label: 'Activo', cls: 's-live', active: true };
}

export function ApiAccessPage() {
  const { site } = useSites();
  const auth = useAuth();
  const toast = useToast();
  const isOwner = Boolean(auth && auth.me.role !== 'site_owner');
  const [tokens, setTokens] = useState<ApiToken[] | null>(null);
  const [loadErr, setLoadErr] = useState('');
  const [name, setName] = useState('');
  const [days, setDays] = useState('365');
  const [formErr, setFormErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<(ApiToken & { token: string }) | null>(null);
  const [copied, setCopied] = useState(false);
  const [revoking, setRevoking] = useState<ApiToken | null>(null);
  const [revokeBusy, setRevokeBusy] = useState(false);
  const [revokeErr, setRevokeErr] = useState('');

  useEffect(() => { document.title = 'Acceso por API'; }, []);

  const load = useCallback(async () => {
    if (!site || !isOwner) return;
    try { setTokens(await tokensApi.list(site.id)); setLoadErr(''); } catch (e) { setLoadErr((e as Error).message); }
  }, [site, isOwner]);
  // Al cambiar de sitio se olvida el token recién creado: nunca se muestra el de un sitio en otro.
  useEffect(() => { setTokens(null); setCreated(null); void load(); }, [load]);

  if (!auth) {
    return <main className="page" id="main"><div className="page-inner"><h1>Acceso por API</h1><p className="lead">Los tokens solo existen cuando el editor trabaja con el API (Neon). En el modo sin conexión no hay nada que consultar desde fuera.</p></div></main>;
  }
  if (!isOwner) {
    return <main className="page" id="main"><div className="page-inner"><h1>Acceso por API</h1><p className="lead">Solo un administrador puede crear tokens de API. Pídeselo a quien administra tu cuenta.</p></div></main>;
  }

  const create = async () => {
    if (!site) return;
    if (!name.trim()) { setFormErr('Escribe para qué es el token, por ejemplo «Web de la tienda».'); return; }
    setBusy(true); setFormErr('');
    try {
      const t = await tokensApi.create(site.id, name.trim(), days ? Number(days) : undefined);
      setCreated(t); setCopied(false); setName('');
      await load();
    } catch (e) { setFormErr((e as Error).message); }
    finally { setBusy(false); }
  };

  const copy = async (text: string, what: string) => {
    try { await navigator.clipboard.writeText(text); if (what === 'token') setCopied(true); toast(what === 'token' ? 'Token copiado.' : 'Ejemplo copiado.'); }
    catch { toast('No se pudo copiar. Selecciona el texto y cópialo a mano.', 'error'); }
  };

  const revoke = async () => {
    if (!site || !revoking) return;
    setRevokeBusy(true); setRevokeErr('');
    try {
      await tokensApi.revoke(site.id, revoking.id);
      if (created?.id === revoking.id) setCreated(null);
      toast(`Token «${revoking.name}» revocado. Deja de funcionar de inmediato.`);
      setRevoking(null);
      await load();
    } catch (e) { setRevokeErr((e as Error).message); }
    finally { setRevokeBusy(false); }
  };

  const base = `${window.location.origin}/api/v1/s/${site?.id ?? ''}`;
  const example = `curl -H "Authorization: Bearer ${created?.token ?? '<token>'}" \\\n  "${base}/documents"`;

  return (
    <main className="page" id="main">
      <div className="page-inner">
        <h1>Acceso por API</h1>
        <p className="lead">Crea un token para que la web de <strong>{site?.name}</strong> lea su contenido publicado. El token solo sirve para consultar este sitio: no puede editar, publicar ni ver borradores.</p>

        {created && (
          <section className="panel tok-new" aria-labelledby="tok-new-h">
            <h2 id="tok-new-h"><KeyRound className="lucide" aria-hidden="true" />Token «{created.name}» listo</h2>
            <div className="banner" role="note"><TriangleAlert className="lucide" aria-hidden="true" /><div><strong>Cópialo ahora: no se vuelve a mostrar.</strong>Guárdalo como secreto en el proyecto del cliente (por ejemplo <code>CMS_TOKEN</code>), nunca en el código ni en el navegador. Si se pierde, revócalo y crea otro.</div></div>
            <div className="tok-secret">
              <code className="mono" aria-label="Token de API">{created.token}</code>
              <button className="btn btn-primary btn-sm" type="button" onClick={() => void copy(created.token, 'token')}>
                {copied ? <Check className="lucide" aria-hidden="true" /> : <Copy className="lucide" aria-hidden="true" />}{copied ? 'Copiado' : 'Copiar token'}
              </button>
            </div>
            <p className="tok-label">Cómo se usa</p>
            <div className="tok-secret">
              <pre className="mono">{example}</pre>
              <button className="btn btn-secondary btn-sm" type="button" onClick={() => void copy(example, 'ejemplo')}><Copy className="lucide" aria-hidden="true" />Copiar</button>
            </div>
            <p className="muted tok-routes">Rutas disponibles: <code>/types</code>, <code>/documents</code>, <code>/documents/:id</code>, <code>/assets/:id/content</code> y <code>/site/snapshot</code>.</p>
            <div className="acts"><button className="btn btn-ghost btn-sm" type="button" onClick={() => setCreated(null)}>Ya lo guardé</button></div>
          </section>
        )}

        <section className="panel" aria-labelledby="tok-form-h">
          <h2 id="tok-form-h">Nuevo token</h2>
          <form className="tok-form" onSubmit={(e) => { e.preventDefault(); void create(); }}>
            <div className="field">
              <label htmlFor="tok-name">Para qué es</label>
              <div className="control"><input id="tok-name" value={name} maxLength={80} placeholder="Ej.: Web de la tienda" autoComplete="off" onChange={(e) => setName(e.target.value)} /></div>
              <span className="help">Así lo reconocerás en la lista. Usa un token por web o servicio.</span>
            </div>
            <div className="field">
              <label htmlFor="tok-days">Caduca en</label>
              <div className="control">
                <select id="tok-days" value={days} onChange={(e) => setDays(e.target.value)}>
                  {EXPIRY.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>
            <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? <span className="spinner" aria-hidden="true" /> : <KeyRound className="lucide" aria-hidden="true" />}Crear token</button>
          </form>
          {formErr && <p className="err" role="alert"><TriangleAlert className="lucide" aria-hidden="true" />{formErr}</p>}
        </section>

        <section className="panel" aria-labelledby="tok-list-h">
          <h2 id="tok-list-h">Tokens de {site?.name}</h2>
          {loadErr && <p className="err" role="alert"><TriangleAlert className="lucide" aria-hidden="true" />{loadErr}</p>}
          {!loadErr && tokens === null && <div className="skeleton" aria-busy="true" />}
          {tokens?.length === 0 && <p className="muted">Este sitio todavía no tiene tokens.</p>}
          {tokens && tokens.length > 0 && (
            <ul className="tok-list">
              {tokens.map((t) => {
                const s = stateOf(t);
                return (
                  <li key={t.id} className={`tok-row ${s.active ? '' : 'off'}`}>
                    <div className="tok-main">
                      <strong>{t.name}</strong>
                      <span className="muted">
                        Creado {fmtDate(t.createdAt)} · {t.lastUsedAt ? `último uso ${fmtWhen(t.lastUsedAt)}` : 'sin usar'}
                        {t.revokedAt ? ` · revocado ${fmtDate(t.revokedAt)}` : t.expiresAt ? ` · caduca ${fmtDate(t.expiresAt)}` : ' · sin caducidad'}
                      </span>
                      <span className="mono muted">{t.id}</span>
                    </div>
                    <span className={`state ${s.cls}`}>{s.label}</span>
                    {s.active
                      ? <button className="btn btn-ghost btn-sm tok-revoke" type="button" onClick={() => { setRevokeErr(''); setRevoking(t); }}>Revocar</button>
                      : <span aria-hidden="true" />}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <ModalOverlay className="overlay" isOpen={Boolean(revoking)} onOpenChange={(o) => { if (!o) setRevoking(null); }} isDismissable={!revokeBusy}>
        <Modal>
          <Dialog className="dialog" role="alertdialog">
            <Heading slot="title">¿Revocar «{revoking?.name}»?</Heading>
            <p className="muted">La web o servicio que lo use dejará de recibir contenido al instante. <strong>No se puede deshacer</strong>: para volver a conectarla tendrás que crear un token nuevo.</p>
            {revokeErr && <p className="err" role="alert"><TriangleAlert className="lucide" aria-hidden="true" />{revokeErr}</p>}
            <div className="acts">
              <button className="btn btn-ghost" type="button" onClick={() => setRevoking(null)} disabled={revokeBusy}>Cancelar</button>
              <button className="btn btn-danger" type="button" onClick={() => void revoke()} disabled={revokeBusy}>{revokeBusy ? <span className="spinner" aria-hidden="true" /> : null}Revocar token</button>
            </div>
          </Dialog>
        </Modal>
      </ModalOverlay>
    </main>
  );
}
