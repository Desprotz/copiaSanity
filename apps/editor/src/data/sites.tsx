import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ApiStore, sitesApi } from './api-store';
import { StoreContext } from './hooks';
import { LocalStore } from './local-store';
import type { ContentStore } from './store';
import type { Site } from './types';

interface SitesValue {
  sites: Site[];
  site: Site | undefined;
  /** El origen de datos admite varios sitios (API) o solo uno (este navegador). */
  multi: boolean;
  select: (id: string) => void;
  create: (name: string) => Promise<Site>;
}

const SitesContext = createContext<SitesValue | null>(null);
export const useSites = () => { const v = useContext(SitesContext); if (!v) throw new Error('SitesContext sin proveedor'); return v; };

const KEY = 'cms.site';
const LOCAL_SITE: Site = { id: 'local', name: 'Portal de prueba', createdAt: new Date(0).toISOString() };

function slug(name: string) {
  return name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'sitio';
}

/** Elige el sitio de trabajo y entrega a las pantallas la capa de datos de ese sitio (nunca la de otro). */
export function SitesProvider({ api, children }: { api: boolean; children: ReactNode }) {
  const [sites, setSites] = useState<Site[]>(api ? [] : [LOCAL_SITE]);
  const [error, setError] = useState('');
  const [siteId, setSiteId] = useState<string | null>(() => { try { return localStorage.getItem(KEY); } catch { return null; } });

  const load = useCallback(async () => {
    if (!api) return;
    try { setSites(await sitesApi.list()); setError(''); } catch (e) { setError((e as Error).message); }
  }, [api]);
  useEffect(() => { void load(); }, [load]);

  const site = sites.find((s) => s.id === siteId) ?? sites[0];
  const store = useMemo<ContentStore | null>(() => (api ? (site ? new ApiStore(site.id) : null) : new LocalStore()), [api, site?.id]);
  useEffect(() => () => { (store as ApiStore | null)?.dispose?.(); }, [store]);

  const select = useCallback((id: string) => {
    setSiteId(id);
    try { localStorage.setItem(KEY, id); } catch { /* sin almacenamiento */ }
  }, []);

  const create = useCallback(async (name: string) => {
    let id = slug(name);
    if (id.length < 2) id = `${id}-web`;
    if (sites.some((s) => s.id === id)) id = `${id}-${Math.random().toString(36).slice(2, 6)}`.slice(0, 40);
    const s = await sitesApi.create(id, name.trim());
    await load();
    select(s.id);
    return s;
  }, [sites, load, select]);

  const value = useMemo(() => ({ sites, site, multi: api, select, create }), [sites, site, api, select, create]);

  if (error) return <div className="empty" style={{ paddingTop: 96 }}><strong>No se pudo conectar con el API</strong><span>{error}</span><span className="muted">¿Está corriendo <code>npm run dev:api</code>?</span><button className="btn btn-secondary" type="button" onClick={() => void load()}>Reintentar</button></div>;
  if (!store || !site) return <div className="empty" style={{ paddingTop: 96 }} aria-busy="true"><span className="spinner" aria-hidden="true" /><span>Cargando tus sitios…</span></div>;

  return (
    <SitesContext.Provider value={value}>
      <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
    </SitesContext.Provider>
  );
}
