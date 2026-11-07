// Modelo de dominio del CMS. Estas formas son las mismas que devolverá el API real
// (replica/api.md); la capa local (local-store.ts) solo cambia dónde se guardan.

export type LineColor = 'red' | 'blue' | 'green' | 'amber' | 'violet';

export type FieldKind = 'string' | 'number' | 'text' | 'richtext' | 'boolean' | 'reference' | 'image';

/** Valor de un campo de imagen: referencia a un recurso (nunca los bytes dentro del documento). */
export interface ImageValue { assetId: string; alt: string }

export interface Asset { id: string; width: number; height: number; bytes: number; type: string; originalName: string; createdAt: string }

export interface FieldDef {
  key: string;
  label: string;
  kind: FieldKind;
  required: boolean;
  help?: string;
  min?: number;
  max?: number;
  unit?: string;
  /** Tipo destino cuando kind === 'reference'. */
  refType?: string;
}

export interface ContentType {
  id: string;
  name: string;
  plural: string;
  color: LineColor;
  /** Campo que se usa como título en listas y en el sitio. */
  titleField: string;
  fields: FieldDef[];
  version: number;
}

/** Una web administrada desde el CMS (propia o de un cliente). */
export interface Site { id: string; name: string; createdAt: string }

export type DocData = Record<string, unknown>;

export interface CmsDocument {
  id: string;
  typeId: string;
  /** Borrador vivo; null si no hay cambios sobre lo publicado. */
  draft: DocData | null;
  published: DocData | null;
  /** Revisión del borrador: control optimista (ETag) para no pisar cambios de otra pestaña. */
  rev: number;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}

/** Estado editorial derivado. Cada uno tiene forma, palabra y color propios en la interfaz. */
export type DocState = 'draft' | 'changed' | 'waiting' | 'live';

export interface SiteStatus {
  /** Publicaciones que todavía no están en el sitio público. */
  pending: number;
  building: boolean;
  lastBuiltAt: string | null;
  /** Próxima compilación prevista (agrupada). */
  nextBuildAt: string | null;
}

export interface SiteSnapshot {
  builtAt: string;
  types: ContentType[];
  documents: { id: string; typeId: string; data: DocData; publishedAt: string }[];
}

export type FieldErrors = Record<string, string>;

export class ConflictError extends Error {
  constructor(public readonly current: CmsDocument) {
    super('El documento cambió en otra pestaña.');
  }
}
