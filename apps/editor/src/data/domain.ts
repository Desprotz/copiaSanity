import type { CmsDocument, ContentType, DocData, DocState, FieldErrors } from './types';

/** Datos que se editan: el borrador si existe, si no lo publicado. */
export function workingData(doc: CmsDocument): DocData {
  return doc.draft ?? doc.published ?? {};
}

export function docTitle(type: ContentType | undefined, doc: CmsDocument): string {
  const value = type ? workingData(doc)[type.titleField] : undefined;
  return typeof value === 'string' && value.trim() ? value : 'Sin título';
}

export function docState(doc: CmsDocument, lastBuiltAt: string | null): DocState {
  if (!doc.published) return 'draft';
  if (doc.draft) return 'changed';
  if (!lastBuiltAt || (doc.publishedAt && doc.publishedAt > lastBuiltAt)) return 'waiting';
  return 'live';
}

export const STATE_LABEL: Record<DocState, string> = {
  draft: 'Borrador',
  changed: 'Cambios sin publicar',
  waiting: 'Esperando el sitio',
  live: 'En el sitio',
};

function isEmpty(v: unknown): boolean {
  if (v === undefined || v === null) return true;
  if (typeof v === 'string') return v.replace(/<[^>]*>/g, '').trim() === '';
  return false;
}

/** Validación estricta: la que exige publicar. El navegador ayuda, pero el API real repetirá esta comprobación. */
export function validate(type: ContentType, data: DocData): FieldErrors {
  const errors: FieldErrors = {};
  for (const f of type.fields) {
    const v = data[f.key];
    if (f.kind === 'image') {
      const img = v as { assetId?: string; alt?: string } | undefined;
      if (!img?.assetId) { if (f.required) errors[f.key] = `Agrega «${f.label}» para poder publicar.`; }
      else if (!img.alt?.trim()) errors[f.key] = 'Describe la foto en una frase: la leen quienes no pueden verla.';
      continue;
    }
    if (isEmpty(v)) {
      if (f.required) errors[f.key] = `Completa «${f.label}» para poder publicar.`;
      continue;
    }
    if (f.kind === 'number') {
      const n = typeof v === 'number' ? v : Number(v);
      if (!Number.isFinite(n)) { errors[f.key] = 'Escribe solo números.'; continue; }
      const { min, max } = f;
      if (min !== undefined && max !== undefined && (n < min || n > max)) errors[f.key] = `Escribe un número entre ${min} y ${max}.`;
      else if (min !== undefined && n < min) errors[f.key] = `El mínimo es ${min}.`;
      else if (max !== undefined && n > max) errors[f.key] = `El máximo es ${max}.`;
    }
  }
  return errors;
}

export function slugKey(label: string): string {
  const base = label
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  return base || 'campo';
}

export function newId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function formatTime(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false });
}

export function formatWhen(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return formatTime(iso);
  const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'ayer';
  return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' }).replace('.', '');
}
