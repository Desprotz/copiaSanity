import { FileText, Plus, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { docState, docTitle, formatWhen } from '../data/domain';
import { useLive, useStore } from '../data/hooks';
import type { DocState } from '../data/types';
import { LINE_VAR, MiniRoute, StateBadge, useToast } from '../components/ui';
import { DocumentEditor } from '../components/DocumentEditor';

type Filter = 'all' | 'pending' | 'live';
const FILTERS: [Filter, string][] = [['all', 'Todos'], ['pending', 'Por publicar'], ['live', 'Publicados']];
const matches = (f: Filter, s: DocState) => f === 'all' || (f === 'pending' ? s === 'draft' || s === 'changed' : s === 'waiting' || s === 'live');

export function ContentPage() {
  const { typeId = '', docId } = useParams();
  const store = useStore();
  const navigate = useNavigate();
  const toast = useToast();
  const { data: types } = useLive((s) => s.listTypes(), []);
  const { data: docs } = useLive((s) => s.listDocuments(typeId), [typeId]);
  const { data: site } = useLive((s) => s.siteStatus(), []);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const type = types?.find((t) => t.id === typeId);

  const rows = useMemo(() => {
    if (!docs || !type) return undefined;
    const q = query.trim().toLowerCase();
    return docs
      .map((d) => ({ d, title: docTitle(type, d), state: docState(d, site?.lastBuiltAt ?? null) }))
      .filter((r) => matches(filter, r.state) && (!q || JSON.stringify(r.d.draft ?? r.d.published ?? {}).toLowerCase().includes(q)));
  }, [docs, type, query, filter, site?.lastBuiltAt]);

  if (types && !type) {
    return <main className="editor" id="main"><div className="editor-inner"><div className="empty"><strong>Este tipo de contenido no existe.</strong><Link className="btn btn-secondary" to="/">Ir al inicio del sitio</Link></div></div></main>;
  }

  const create = async () => {
    try {
      const d = await store.createDocument(typeId);
      navigate(`/c/${typeId}/${d.id}`);
    } catch (e) { toast((e as Error).message, 'error'); }
  };

  return (
    <div className="content" data-view={docId ? 'editor' : 'list'}>
      <section className="list" aria-labelledby="list-title">
        <div className="list-head">
          <h1 id="list-title">{type?.plural ?? 'Cargando…'}</h1>
          <button className="btn btn-secondary btn-sm" type="button" onClick={create} disabled={!type}><Plus className="lucide" aria-hidden="true" />Nuevo</button>
        </div>
        <nav className="m-types list-types" aria-label="Tipos de contenido">
          {types?.map((t) => <Link key={t.id} to={`/c/${t.id}`} aria-current={t.id === typeId ? 'page' : undefined} style={{ ['--c' as string]: LINE_VAR[t.color] }}><i aria-hidden="true" />{t.plural}</Link>)}
          <Link to="/modelos" style={{ ['--c' as string]: 'var(--cms-color-line-pending)' }}><i aria-hidden="true" />Tipos</Link>
        </nav>
        <div className="search">
          <Search className="lucide" aria-hidden="true" />
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={`Buscar en ${type?.plural.toLowerCase() ?? ''}`} aria-label={`Buscar en ${type?.plural ?? 'documentos'}`} />
        </div>
        <div className="tabs" role="group" aria-label="Filtrar">
          {FILTERS.map(([f, label]) => (
            <button key={f} className="tab" type="button" aria-pressed={filter === f} onClick={() => setFilter(f)}>{label}</button>
          ))}
        </div>
        <div className="rows">
          {!rows && [0, 1, 2, 3].map((i) => <div key={i} className="skeleton" aria-hidden="true" />)}
          {rows && rows.length === 0 && (
            <div className="empty">
              <FileText className="lucide" aria-hidden="true" />
              {docs?.length ? <><strong>Nada coincide</strong><span>Prueba otra palabra o quita el filtro.</span></> : <><strong>Todavía no hay {type?.plural.toLowerCase()}</strong><button className="btn btn-primary btn-sm" type="button" onClick={create}>Crear el primero</button></>}
            </div>
          )}
          {rows?.map(({ d, title, state }) => (
            <Link key={d.id} className="doc" to={`/c/${typeId}/${d.id}`} aria-current={d.id === docId ? 'page' : undefined}>
              <span className="t">{title}</span>
              <span className="when mono">{formatWhen(d.updatedAt)}</span>
              <span className="meta">{type && <MiniRoute state={state} color={type.color} />}<StateBadge state={state} /></span>
            </Link>
          ))}
        </div>
      </section>
      <main className="editor" id="main" tabIndex={-1}>
        {docId && type ? (
          <DocumentEditor key={docId} docId={docId} type={type} types={types ?? []} />
        ) : (
          <div className="editor-inner">
            <div className="empty" style={{ paddingTop: 'var(--cms-space-9)' }}>
              <span className="mini" aria-hidden="true" style={{ ['--c' as string]: type ? LINE_VAR[type.color] : undefined }}><i className="on" /><b className="on" /><i className="on" /><b className="on" /><i className="on" /></span>
              <strong>Elige un documento de la lista</strong>
              <span>o crea uno nuevo para empezar su recorrido.</span>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
