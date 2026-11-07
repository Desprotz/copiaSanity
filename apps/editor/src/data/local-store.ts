import { blobUrl, clearBlobs, putBlob } from './assets-db';
import { newId, validate } from './domain';
import { SEED_TYPES, seedDocuments } from './seed';
import type { ContentStore } from './store';
import { ConflictError, type Asset, type CmsDocument, type ContentType, type DocData, type SiteSnapshot, type SiteStatus } from './types';

const KEY = 'cms.local.v1';
/** Las publicaciones se agrupan: la compilación espera este tiempo tras la última publicación. */
const BATCH_MS = 6000;
const BUILD_MS = 2500;

interface State {
  types: ContentType[];
  documents: CmsDocument[];
  assets?: Asset[];
  site: { pending: number; building: boolean; lastBuiltAt: string | null; nextBuildAt: string | null; snapshot: SiteSnapshot | null };
}

function initialState(): State {
  const documents = seedDocuments();
  const builtAt = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const state: State = { types: structuredClone(SEED_TYPES), documents, assets: [], site: { pending: 0, building: false, lastBuiltAt: builtAt, nextBuildAt: null, snapshot: null } };
  state.site.snapshot = snapshotOf(state, builtAt);
  return state;
}

function snapshotOf(state: State, builtAt: string): SiteSnapshot {
  return {
    builtAt,
    types: structuredClone(state.types),
    documents: state.documents
      .filter((d) => d.published && d.publishedAt)
      .map((d) => ({ id: d.id, typeId: d.typeId, data: structuredClone(d.published!), publishedAt: d.publishedAt! })),
  };
}

/** Ajusta datos guardados por versiones anteriores del editor. */
function migrate(s: State): State {
  s.assets ??= [];
  const prop = s.types.find((t) => t.id === 'propiedad');
  const foto = SEED_TYPES[0].fields.find((f) => f.key === 'foto');
  if (prop && foto && !prop.fields.some((f) => f.key === 'foto')) {
    const i = prop.fields.findIndex((f) => f.key === 'en_venta');
    prop.fields.splice(i + 1, 0, structuredClone(foto));
    prop.version += 1;
  }
  return s;
}

// VITE_FAKE_LATENCY simula la demora del servidor real (modo «lento» para probar el autoguardado).
const LATENCY = Number(import.meta.env.VITE_FAKE_LATENCY ?? 120) || 120;
const delay = () => new Promise<void>((r) => setTimeout(r, LATENCY));

export class LocalStore implements ContentStore {
  private state: State;
  private listeners = new Set<() => void>();
  private timer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    this.state = this.load();
    window.addEventListener('storage', (e) => {
      if (e.key !== KEY) return;
      this.state = this.load();
      this.emit();
    });
    this.scheduleBuild();
  }

  private load(): State {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return migrate(JSON.parse(raw) as State);
    } catch { /* almacenamiento bloqueado o dañado: se vuelve a los datos de prueba */ }
    const s = initialState();
    this.persist(s);
    return s;
  }

  private persist(s: State = this.state) {
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* sin almacenamiento: la sesión sigue en memoria */ }
  }

  private commit() { this.persist(); this.emit(); }
  private emit() { this.listeners.forEach((l) => l()); }

  private find(id: string): CmsDocument {
    const d = this.state.documents.find((x) => x.id === id);
    if (!d) throw new Error('El documento no existe.');
    return d;
  }

  private markForBuild() {
    this.state.site.pending += 1;
    this.state.site.nextBuildAt = new Date(Date.now() + BATCH_MS).toISOString();
    this.scheduleBuild();
  }

  private scheduleBuild() {
    clearTimeout(this.timer);
    const { nextBuildAt, pending } = this.state.site;
    if (!nextBuildAt || pending === 0) return;
    const wait = Math.max(0, new Date(nextBuildAt).getTime() - Date.now());
    this.timer = setTimeout(() => void this.runBuild(), wait);
  }

  private async runBuild() {
    if (this.state.site.building) return;
    this.state.site.building = true;
    this.commit();
    await new Promise((r) => setTimeout(r, BUILD_MS));
    const builtAt = new Date().toISOString();
    this.state.site = { pending: 0, building: false, lastBuiltAt: builtAt, nextBuildAt: null, snapshot: snapshotOf(this.state, builtAt) };
    this.commit();
  }

  async listTypes() { await delay(); return structuredClone(this.state.types); }

  async saveType(type: ContentType) {
    await delay();
    const i = this.state.types.findIndex((t) => t.id === type.id);
    const saved = { ...structuredClone(type), version: i >= 0 ? this.state.types[i].version + 1 : 1 };
    if (i >= 0) this.state.types[i] = saved; else this.state.types.push(saved);
    this.commit();
    return structuredClone(saved);
  }

  async deleteType(id: string) {
    await delay();
    if (this.state.documents.some((d) => d.typeId === id)) throw new Error('Este tipo todavía tiene documentos. Elimínalos primero.');
    this.state.types = this.state.types.filter((t) => t.id !== id);
    this.commit();
  }

  async listDocuments(typeId?: string) {
    await delay();
    const docs = typeId ? this.state.documents.filter((d) => d.typeId === typeId) : this.state.documents;
    return structuredClone(docs).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async getDocument(id: string) { await delay(); const d = this.state.documents.find((x) => x.id === id); return d && structuredClone(d); }

  async createDocument(typeId: string) {
    await delay();
    const now = new Date().toISOString();
    const d: CmsDocument = { id: newId(typeId), typeId, draft: {}, published: null, rev: 1, createdAt: now, updatedAt: now, publishedAt: null };
    this.state.documents.push(d);
    this.commit();
    return structuredClone(d);
  }

  async updateDraft(id: string, data: DocData, expectedRev: number) {
    await delay();
    const d = this.find(id);
    if (d.rev !== expectedRev) throw new ConflictError(structuredClone(d));
    d.draft = structuredClone(data);
    d.rev += 1;
    d.updatedAt = new Date().toISOString();
    this.commit();
    return structuredClone(d);
  }

  async publish(id: string, expectedRev: number) {
    await delay();
    const d = this.find(id);
    if (d.rev !== expectedRev) throw new ConflictError(structuredClone(d));
    const type = this.state.types.find((t) => t.id === d.typeId);
    const data = d.draft ?? d.published;
    if (!type || !data) throw new Error('No hay nada que publicar.');
    if (Object.keys(validate(type, data)).length) throw new Error('Hay campos por corregir.');
    const now = new Date().toISOString();
    d.published = structuredClone(data);
    d.draft = null;
    d.rev += 1;
    d.publishedAt = now;
    d.updatedAt = now;
    this.markForBuild();
    this.commit();
    return structuredClone(d);
  }

  async discardDraft(id: string) {
    await delay();
    const d = this.find(id);
    if (!d.published) throw new Error('Este documento nunca se publicó; no hay versión a la que volver.');
    d.draft = null; d.rev += 1; d.updatedAt = new Date().toISOString();
    this.commit();
    return structuredClone(d);
  }

  async unpublish(id: string) {
    await delay();
    const d = this.find(id);
    if (!d.published) return structuredClone(d);
    d.draft = d.draft ?? d.published;
    d.published = null; d.publishedAt = null; d.rev += 1; d.updatedAt = new Date().toISOString();
    this.markForBuild();
    this.commit();
    return structuredClone(d);
  }

  async deleteDocument(id: string) {
    await delay();
    const d = this.find(id);
    const referenced = this.state.documents.some((o) => o.id !== id && [o.draft, o.published].some((data) => data && Object.values(data).includes(id)));
    if (referenced) throw new Error('Otro documento enlaza a este. Quita esa referencia antes de eliminarlo.');
    this.state.documents = this.state.documents.filter((x) => x.id !== id);
    if (d.published) this.markForBuild();
    this.commit();
  }

  async duplicate(id: string) {
    await delay();
    const src = this.find(id);
    const now = new Date().toISOString();
    const data = structuredClone(src.draft ?? src.published ?? {});
    const type = this.state.types.find((t) => t.id === src.typeId);
    if (type && typeof data[type.titleField] === 'string') data[type.titleField] = `${data[type.titleField] as string} (copia)`;
    const d: CmsDocument = { id: newId(src.typeId), typeId: src.typeId, draft: data, published: null, rev: 1, createdAt: now, updatedAt: now, publishedAt: null };
    this.state.documents.push(d);
    this.commit();
    return structuredClone(d);
  }

  async uploadImage(blob: Blob, meta: Omit<Asset, 'id' | 'createdAt' | 'bytes' | 'type'>) {
    const asset: Asset = { ...meta, id: newId('img'), bytes: blob.size, type: blob.type, createdAt: new Date().toISOString() };
    await putBlob(asset.id, blob);
    (this.state.assets ??= []).push(asset);
    this.commit();
    return structuredClone(asset);
  }

  imageUrl(assetId: string) { return blobUrl(assetId); }

  async siteStatus(): Promise<SiteStatus> {
    const { pending, building, lastBuiltAt, nextBuildAt } = this.state.site;
    return { pending, building, lastBuiltAt, nextBuildAt };
  }

  async buildSiteNow() { clearTimeout(this.timer); await this.runBuild(); }

  async siteSnapshot() { return structuredClone(this.state.site.snapshot); }

  async resetDemo() { clearTimeout(this.timer); await clearBlobs().catch(() => undefined); this.state = initialState(); this.commit(); }

  subscribe(listener: () => void) { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; }
}
