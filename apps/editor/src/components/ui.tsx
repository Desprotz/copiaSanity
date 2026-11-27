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

/** La clave 'amber' se conserva en datos y API; en Ofenix se muestra turquesa para no confundirse con el oro de brasa. */
export const LINE_NAME: Record<LineColor, string> = { red: 'Carmín', blue: 'Azul', green: 'Verde', amber: 'Turquesa', violet: 'Violeta' };

export function StateBadge({ state }: { state: DocState }) {
  return <span className={`state s-${state}`}>{STATE_LABEL[state]}</span>;
}

/** Cuántas estaciones del recorrido (0–3) están cumplidas para un estado. */
export function stationsDone(state: DocState): number {
  return { draft: 0, changed: 0, waiting: 2, live: 3 }[state];
}

/** Mismo cálculo que el recorrido grande del editor: la lista y el editor nunca dicen estaciones distintas. */
export function MiniRoute({ state, color, reviewed }: { state: DocState; color: LineColor; reviewed: boolean }) {
  const done = Math.max(reviewed ? 1 : 0, stationsDone(state));
  const cur = !reviewed ? 1 : state === 'waiting' ? 3 : -1;
  return (
    <span className="mini" aria-hidden="true" style={{ ['--c' as string]: LINE_VAR[color] }}>
      {[0, 1, 2, 3].map((i) => <i key={i} className={i === cur ? 'cur' : i <= done ? 'on' : ''} />)}
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
