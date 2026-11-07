import type { ContentStore } from './store';
import { ConflictError, type Asset, type CmsDocument, type ContentType, type DocData, type Site, type SiteSnapshot, type SiteStatus } from './types';

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch('/api/v1' + path, { ...init, headers: { 'content-type': 'application/json', 'x-cms': '1' }, credentials: 'same-origin' }).catch(() => { throw new Error('Sin conexión con el servidor.'); });
  if (res.status === 401) window.dispatchEvent(new Event('cms:session-expired'));
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(typeof body.error === 'string' ? body.error : `El servidor respondió ${res.status}.`);
  return body as T;
}

/** Sitios: fuera del contrato de contenido porque no pertenecen a ningún sitio. */
export const sitesApi = {
  list: () => call<Site[]>('/sites'),
  create: (id: string, name: string) => call<Site>('/sites', { method: 'POST', body: JSON.stringify({ id, name }) }),
};

/**
 * Capa de datos contra el API propio (apps/api: Hono en Cloudflare Workers + Neon).
 * Mismo contrato que LocalStore: ninguna pantalla sabe cuál de las dos está usando.
 */
export class ApiStore implements ContentStore {
  private listeners = new Set<() => void>();
  private seq = -1;
  private timer: ReturnType<typeof setInterval> | undefined;

  private base: string;

  constructor(site: string) {
    this.base = `/api/v1/s/${encodeURIComponent(site)}`;
    // Avisos de cambios: consulta barata cada 3 s mientras la pestaña está visible (también hace avanzar la compilación agrupada).
    const tick = () => { if (document.visibilityState === 'visible') void this.poll(); };
    this.timer = setInterval(tick, 3000);
    document.addEventListener('visibilitychange', tick);
  }

  private async req<T>(path: string, init: RequestInit = {}): Promise<T> {
    let res: Response;
    try {
      res = await fetch(this.base + path, { ...init, headers: { 'x-cms': '1', ...(init.body && !(init.body instanceof Blob) ? { 'content-type': 'application/json' } : {}), ...init.headers }, credentials: 'same-origin' });
    } catch {
      throw new Error('Sin conexión con el servidor. Revisa tu internet; tus cambios siguen en pantalla.');
    }
    if (res.status === 401) { window.dispatchEvent(new Event('cms:session-expired')); throw new Error('Tu sesión terminó. Vuelve a iniciar sesión.'); }
    if (res.status === 204) return undefined as T;
    const body = await res.json().catch(() => ({}));
    if (res.status === 409 && body.current) throw new ConflictError(body.current as CmsDocument);
    if (!res.ok) throw new Error(typeof body.error === 'string' ? body.error : `El servidor respondió ${res.status}.`);
    return body as T;
  }

  private async write<T>(p: Promise<T>): Promise<T> {
    const r = await p;
    this.emit();
    return r;
  }

  private async poll() {
    try {
      const { seq } = await this.req<{ seq: number }>('/changes');
      if (seq !== this.seq) { const first = this.seq === -1; this.seq = seq; if (!first) this.emit(); }
    } catch { /* sin red: se reintenta en el siguiente ciclo */ }
  }

  private emit() { this.listeners.forEach((l) => l()); }

  listTypes() { return this.req<ContentType[]>('/types'); }
  saveType(t: ContentType) { return this.write(this.req<ContentType>(`/types/${t.id}`, { method: 'PUT', body: JSON.stringify(t) })); }
  deleteType(id: string) { return this.write(this.req<void>(`/types/${id}`, { method: 'DELETE' })); }

  listDocuments(typeId?: string) { return this.req<CmsDocument[]>(`/documents${typeId ? `?type=${encodeURIComponent(typeId)}` : ''}`); }
  async getDocument(id: string) {
    try { return await this.req<CmsDocument>(`/documents/${id}`); }
    catch (e) { if ((e as Error).message === 'El documento no existe.') return undefined; throw e; }
  }
  createDocument(typeId: string) { return this.write(this.req<CmsDocument>('/documents', { method: 'POST', body: JSON.stringify({ typeId }) })); }
  updateDraft(id: string, data: DocData, rev: number) { return this.write(this.req<CmsDocument>(`/documents/${id}/draft`, { method: 'PATCH', body: JSON.stringify({ data, rev }) })); }
  publish(id: string, rev: number) { return this.write(this.req<CmsDocument>(`/documents/${id}/publish`, { method: 'POST', body: JSON.stringify({ rev }) })); }
  discardDraft(id: string) { return this.write(this.req<CmsDocument>(`/documents/${id}/discard`, { method: 'POST' })); }
  unpublish(id: string) { return this.write(this.req<CmsDocument>(`/documents/${id}/unpublish`, { method: 'POST' })); }
  deleteDocument(id: string) { return this.write(this.req<void>(`/documents/${id}`, { method: 'DELETE' })); }
  duplicate(id: string) { return this.write(this.req<CmsDocument>(`/documents/${id}/duplicate`, { method: 'POST' })); }

  uploadImage(blob: Blob, meta: Omit<Asset, 'id' | 'createdAt' | 'bytes' | 'type'>) {
    const q = new URLSearchParams({ width: String(meta.width), height: String(meta.height), name: meta.originalName.slice(0, 200) });
    return this.req<Asset>(`/assets?${q}`, { method: 'POST', body: blob, headers: { 'content-type': blob.type } });
  }
  async imageUrl(assetId: string) { return `${this.base}/assets/${assetId}/content`; }

  siteStatus() { return this.req<SiteStatus>('/site/status'); }
  buildSiteNow() { return this.write(this.req<void>('/site/build', { method: 'POST' })); }
  siteSnapshot() { return this.req<SiteSnapshot | null>('/site/snapshot'); }

  resetDemo() { return this.write(this.req<void>('/demo/reset', { method: 'POST' })); }

  subscribe(listener: () => void) { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; }

  dispose() { clearInterval(this.timer); }
}
