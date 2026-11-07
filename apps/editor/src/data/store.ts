import type { Asset, CmsDocument, ContentType, DocData, ImportBatch, ImportResult, SiteSnapshot, SiteStatus } from './types';

/**
 * Contrato de la capa de datos. La implementación local (local-store.ts) guarda todo en el
 * navegador; en replica-backend se añadirá otra que llame al API (Hono en Cloudflare + Neon)
 * con estas mismas funciones, de modo que ninguna pantalla cambie.
 */
export interface ContentStore {
  listTypes(): Promise<ContentType[]>;
  saveType(type: ContentType): Promise<ContentType>;
  deleteType(id: string): Promise<void>;

  listDocuments(typeId?: string): Promise<CmsDocument[]>;
  getDocument(id: string): Promise<CmsDocument | undefined>;
  createDocument(typeId: string): Promise<CmsDocument>;
  /** Guarda el borrador. expectedRev evita pisar cambios de otra pestaña (lanza ConflictError). */
  updateDraft(id: string, data: DocData, expectedRev: number): Promise<CmsDocument>;
  /** Publica exactamente la revisión indicada; falla si hay errores de validación o si cambió. */
  publish(id: string, expectedRev: number): Promise<CmsDocument>;
  discardDraft(id: string): Promise<CmsDocument>;
  unpublish(id: string): Promise<CmsDocument>;
  deleteDocument(id: string): Promise<void>;
  duplicate(id: string): Promise<CmsDocument>;

  /** Sube una imagen ya optimizada en el navegador. En el backend real irá a R2. */
  uploadImage(blob: Blob, meta: Omit<Asset, 'id' | 'createdAt' | 'bytes' | 'type'>): Promise<Asset>;
  /** URL para mostrar una imagen guardada (undefined si ya no existe). */
  imageUrl(assetId: string): Promise<string | undefined>;

  siteStatus(): Promise<SiteStatus>;
  /** Pide compilar el sitio ya, sin esperar el agrupamiento. */
  buildSiteNow(): Promise<void>;
  siteSnapshot(): Promise<SiteSnapshot | null>;

  /**
   * Importa un lote en una sola operación: guarda los tipos y crea los documentos. Con publish, solo se
   * publican los que pasan la validación; los demás quedan como borrador.
   */
  importContent(batch: ImportBatch): Promise<ImportResult>;

  resetDemo(): Promise<void>;
  /** Avisa cuando algo cambia (en esta pestaña o en otra). Devuelve la función para dejar de escuchar. */
  subscribe(listener: () => void): () => void;
}
