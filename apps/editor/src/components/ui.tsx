import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import type { DocState, LineColor } from '../data/types';
import { STATE_LABEL } from '../data/domain';

export const LINE_VAR: Record<LineColor, string> = {
  red: 'var(--cms-color-line-red)',
  blue: 'var(--cms-color-line-blue)',
  green: 'var(--cms-color-line-green)',
  amber: 'var(--cms-color-line-amber)',
  violet: 'var(--cms-color-line-violet)',
};

export const LINE_NAME: Record<LineColor, string> = { red: 'Escarlata', blue: 'Azul', green: 'Verde', amber: 'Ámbar', violet: 'Violeta' };

export function StateBadge({ state }: { state: DocState }) {
  return <span className={`state s-${state}`}>{STATE_LABEL[state]}</span>;
}

/** Cuántas estaciones del recorrido (0–3) están cumplidas para un estado. */
export function stationsDone(state: DocState): number {
  return { draft: 0, changed: 0, waiting: 2, live: 3 }[state];
}

export function MiniRoute({ state, color }: { state: DocState; color: LineColor }) {
  const done = stationsDone(state);
  const cur = state === 'live' ? -1 : state === 'waiting' ? 3 : 1;
  const stations = [0, 1, 2, 3];
  return (
    <span className="mini" aria-hidden="true" style={{ ['--c' as string]: LINE_VAR[color] }}>
      {stations.map((i) => (
        <span key={i} style={{ display: 'contents' }}>
          {i > 0 && <b className={i <= done ? 'on' : ''} />}
          <i className={i === cur ? 'cur' : i <= done ? 'on' : ''} />
        </span>
      ))}
    </span>
  );
}

interface Toast { id: number; text: string; tone: 'ok' | 'error' }
const ToastContext = createContext<(text: string, tone?: Toast['tone']) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const show = useCallback((text: string, tone: Toast['tone'] = 'ok') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text, tone }]);
    if (tone === 'ok') setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);
  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.tone}`}>
            <span className={`beacon ${t.tone === 'ok' ? 'calm' : ''}`} aria-hidden="true" />
            <span>{t.text}</span>
            {t.tone === 'error' && (
              <button type="button" className="btn btn-ghost btn-sm" style={{ color: 'inherit' }} onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))}>Cerrar</button>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
