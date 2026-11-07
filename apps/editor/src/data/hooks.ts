import { createContext, useContext, useEffect, useState } from 'react';
import type { ContentStore } from './store';

export const StoreContext = createContext<ContentStore | null>(null);

export function useStore(): ContentStore {
  const s = useContext(StoreContext);
  if (!s) throw new Error('StoreContext sin proveedor');
  return s;
}

/** Lee un dato de la capa de datos y lo vuelve a leer cuando algo cambia. */
export function useLive<T>(read: (s: ContentStore) => Promise<T>, deps: unknown[]): { data: T | undefined; error: Error | undefined } {
  const store = useStore();
  const [data, setData] = useState<T>();
  const [error, setError] = useState<Error>();
  useEffect(() => {
    let alive = true;
    const run = () => read(store).then((d) => { if (alive) { setData(d); setError(undefined); } }, (e: Error) => { if (alive) setError(e); });
    run();
    const off = store.subscribe(run);
    return () => { alive = false; off(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store, ...deps]);
  return { data, error };
}
