import { useEffect, useState } from 'react';
import { useSites } from '../data/sites';
import { useToast } from '../components/ui';

export function SiteSettingsPage() {
  const { site, multi, updateUrl } = useSites();
  const [url, setUrl] = useState(site?.publicUrl ?? '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  useEffect(() => { setUrl(site?.publicUrl ?? ''); setError(''); }, [site?.id, site?.publicUrl]);
  return <main className="page" id="main"><div className="page-inner">
    <h1>Ver sitio</h1><p className="lead">Configura dónde pueden visitar {site?.name}.</p>
    <section className="panel">
      <form onSubmit={async (e) => {
        e.preventDefault(); if (!site) return;
        setBusy(true); setError('');
        try { await updateUrl(site.id, url.trim()); toast('Dirección del sitio guardada.'); }
        catch (e) { setError((e as Error).message); } finally { setBusy(false); }
      }}>
        <div className="field"><label htmlFor="public-url">Dirección pública del sitio</label>
          <div className="control"><input id="public-url" type="url" placeholder="https://ejemplo.com" maxLength={2048} value={url} disabled={!multi || busy} onChange={(e) => setUrl(e.target.value)} /></div>
          <span className="help">Este enlace abre tu web. Cambiarlo no conecta un dominio ni publica el proyecto. Déjalo vacío si aún no tienes dirección.</span>
        </div>
        {!multi && <p className="muted">La dirección pública se configura en los sitios conectados al servidor.</p>}
        {error && <p className="err" role="alert">{error}</p>}
        <div className="acts"><button className="btn btn-primary" disabled={!multi || busy} type="submit">{busy ? 'Guardando…' : 'Guardar dirección'}</button>
          {site?.publicUrl && <a className="btn btn-secondary" href={site.publicUrl} target="_blank" rel="noopener noreferrer">Ir a la web</a>}
        </div>
      </form>
    </section>
  </div></main>;
}
