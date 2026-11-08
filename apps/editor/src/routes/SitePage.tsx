import { useEffect } from 'react';
import { formatTime } from '../data/domain';
import { useLive } from '../data/hooks';
import { useSites } from '../data/sites';
import type { ImageValue, SiteSnapshot } from '../data/types';
import { StoredImage } from '../components/Fields';

// Vista previa del sitio público. Muestra la última COMPILACIÓN, no lo publicado al instante:
// así se comporta el sitio estático real en Cloudflare Pages. En replica-backend esto pasa a apps/site.

const money = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

/** El texto enriquecido viene del editor (Tiptap) con un esquema cerrado; aun así se quitan etiquetas fuera de la lista. */
function safeHtml(html: unknown): string {
  if (typeof html !== 'string') return '';
  return html
    .replace(/<(?!\/?(p|strong|em|ul|ol|li|br)\b)[^>]*>/gi, '')
    // Las etiquetas permitidas se reescriben sin atributos (nada de onclick, style ni href).
    .replace(/<(\/?)(p|strong|em|ul|ol|li|br)\b[^>]*>/gi, '<$1$2>');
}

function nameOf(snap: SiteSnapshot, id: unknown, field: string) {
  const d = snap.documents.find((x) => x.id === id);
  return d ? String(d.data[field] ?? '') : '';
}

export function SitePage() {
  const { site } = useSites();
  if (!site) return <main className="empty"><h1>No tienes sitios asignados</h1><a href="/">Volver al editor</a></main>;
  return <SitePreview key={site.id} />;
}

function SitePreview() {
  const { site } = useSites();
  const { data: snap } = useLive((s) => s.siteSnapshot(), []);
  useEffect(() => { document.title = site?.name ?? 'Sitio'; }, [site?.name]);
  if (snap === undefined) return <div className="site"><div className="site-main"><div className="skeleton" /></div></div>;
  if (!snap) return <div className="site"><div className="site-main"><h1>El sitio todavía no se ha compilado.</h1></div></div>;

  const props = snap.documents.filter((d) => d.typeId === 'propiedad');
  const articles = snap.documents.filter((d) => d.typeId === 'articulo');
  return (
    <div className="site">
      <header className="site-bar">
        <strong>{site?.name}</strong>
        <span className="note mono">compilado {formatTime(snap.builtAt)} · datos ficticios</span>
      </header>
      <main className="site-main">
        <h1>Propiedades</h1>
        <div className="listing">
          {props.map((p) => (
            <article key={p.id}>
              {(p.data.foto as ImageValue | undefined)?.assetId && <StoredImage className="photo" assetId={(p.data.foto as ImageValue).assetId} alt={(p.data.foto as ImageValue).alt} />}
              <h3>{String(p.data.titulo ?? '')}</h3>
              <span className="price">{typeof p.data.precio === 'number' ? money.format(p.data.precio) : ''}</span>
              <span className="muted">{[p.data.barrio, p.data.habitaciones ? `${p.data.habitaciones} hab.` : '', p.data.en_venta ? 'En venta' : 'En arriendo'].filter(Boolean).join(' · ')}</span>
              <div className="body" dangerouslySetInnerHTML={{ __html: safeHtml(p.data.descripcion) }} />
              {p.data.agente ? <span className="muted">Agente: {nameOf(snap, p.data.agente, 'nombre')}</span> : null}
            </article>
          ))}
        </div>
        <h2>Artículos</h2>
        <div className="listing">
          {articles.map((a) => (
            <article key={a.id}>
              <h3>{String(a.data.titulo ?? '')}</h3>
              <p className="body">{String(a.data.resumen ?? '')}</p>
            </article>
          ))}
        </div>
      </main>
    </div>
  );
}
