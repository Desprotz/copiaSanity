// Almacén local de imágenes en IndexedDB (localStorage no aguanta binarios grandes).
// Sustituto temporal de Cloudflare R2: el documento solo guarda el id del recurso.

const DB = 'cms-assets';
const STORE = 'blobs';

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('No se pudo abrir el almacén de imágenes.'));
  });
}

async function tx<T>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise<T>((resolve, reject) => {
    const req = run(db.transaction(STORE, mode).objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('Falló el almacén de imágenes.'));
  });
}

export const putBlob = (id: string, blob: Blob) => tx('readwrite', (s) => s.put(blob, id)).then(() => undefined);
export const getBlob = (id: string) => tx<Blob | undefined>('readonly', (s) => s.get(id));
export const clearBlobs = () => tx('readwrite', (s) => s.clear()).then(() => undefined);

const urls = new Map<string, string>();
/** URL de objeto en caché por id, para no crear una nueva en cada render. */
export async function blobUrl(id: string): Promise<string | undefined> {
  const hit = urls.get(id);
  if (hit) return hit;
  const blob = await getBlob(id);
  if (!blob) return undefined;
  const url = URL.createObjectURL(blob);
  urls.set(id, url);
  return url;
}

export const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_BYTES = 20 * 1024 * 1024;
const MAX_SIDE = 1600;

/** Reduce y convierte a WebP en el navegador antes de guardar (como hará el editor real antes de subir a R2). */
export async function optimizeImage(file: File): Promise<{ blob: Blob; width: number; height: number }> {
  if (!ACCEPTED.includes(file.type)) throw new Error('Ese formato no sirve. Usa JPG, PNG o WebP.');
  if (file.size > MAX_BYTES) throw new Error('La imagen pesa más de 20 MB. Usa una más liviana.');
  let bitmap: ImageBitmap;
  try { bitmap = await createImageBitmap(file); } catch { throw new Error('No se pudo leer la imagen. Puede estar dañada.'); }
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/webp', 0.82));
  if (!blob) throw new Error('No se pudo optimizar la imagen.');
  return { blob, width, height };
}
