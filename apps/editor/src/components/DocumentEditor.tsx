import { ArrowLeft, ArrowRight, Check, Copy, Ellipsis, RotateCcw, Trash2, TriangleAlert, Undo2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button, Dialog, Heading, Menu, MenuItem, MenuTrigger, Modal, ModalOverlay, Popover } from 'react-aria-components';
import { Link, NavLink, useNavigate } from 'react-router';
import { docState, docTitle, formatTime, validate, workingData } from '../data/domain';
import { useLive, useStore } from '../data/hooks';
import { ConflictError, type CmsDocument, type ContentType, type DocData, type DocState } from '../data/types';
import { Field } from './Fields';
import { LINE_VAR, stationsDone, useToast } from './ui';

/** Campos que ocupan todo el ancho del formulario. */
const WIDE = ['text', 'richtext', 'image'];

interface Props { docId: string; type: ContentType; types: ContentType[] }

export function DocumentEditor({ docId, type, types }: Props) {
  const store = useStore();
  const toast = useToast();
  const navigate = useNavigate();
  const { data: doc, error: loadError } = useLive((s) => s.getDocument(docId), [docId]);
  const { data: site } = useLive((s) => s.siteStatus(), []);

  const [data, setData] = useState<DocData | null>(null);
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [showAll, setShowAll] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [conflict, setConflict] = useState<CmsDocument | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [train, setTrain] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const rev = useRef(0);
  const dirty = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Sincroniza con lo guardado cuando no hay cambios locales pendientes.
  useEffect(() => {
    if (!doc) return;
    if (!dirty.current) { setData(workingData(doc)); rev.current = doc.rev; }
    else if (doc.rev !== rev.current) setConflict(doc);
  }, [doc]);

  useEffect(() => () => clearTimeout(timer.current), []);

  const save = async (next: DocData) => {
    setSaving(true);
    try {
      const d = await store.updateDraft(docId, next, rev.current);
      rev.current = d.rev; dirty.current = false;
      setSavedAt(d.updatedAt);
    } catch (e) {
      if (e instanceof ConflictError) setConflict(e.current); else toast((e as Error).message, 'error');
    } finally { setSaving(false); }
  };

  const change = (key: string, value: unknown) => {
    setData((prev) => {
      const next = { ...(prev ?? {}), [key]: value };
      dirty.current = true;
      clearTimeout(timer.current);
      timer.current = setTimeout(() => void save(next), 500);
      return next;
    });
  };

  const flush = async () => {
    if (dirty.current && data) { clearTimeout(timer.current); await save(data); }
  };

  if (loadError) return <div className="editor-inner"><div className="banner danger"><TriangleAlert className="lucide" /><div><strong>No se pudo abrir el documento</strong>{loadError.message}</div></div></div>;
  if (doc === undefined && data === null) return <div className="editor-inner" aria-busy="true"><div className="skeleton" style={{ height: 44, width: '60%', marginBottom: 24 }} /><div className="skeleton" style={{ height: 80 }} /></div>;
  if (!doc) return <div className="editor-inner"><div className="empty"><strong>Este documento ya no existe.</strong><Link className="btn btn-secondary" to={`/c/${type.id}`}>Volver a {type.plural.toLowerCase()}</Link></div></div>;

  const current = data ?? workingData(doc);
  const errors = validate(type, current);
  const errorKeys = type.fields.filter((f) => errors[f.key]).map((f) => f.key);
  // Si hay cambios locales sin guardar, el estado editorial es «cambios» aunque el servidor no lo sepa aún.
  const serverState = docState(doc, site?.lastBuiltAt ?? null);
  const state: DocState = dirty.current && doc.published ? 'changed' : serverState;
  const title = docTitle(type, { ...doc, draft: current });

  // Lleva al primer campo que falta. Es un control aparte: el botón Publicar nunca cambia de función.
  const goToMissing = () => {
    setShowAll(true);
    const sel = `[data-field="${errorKeys[0]}"]`;
    // En orden de preferencia: primero donde se escribe, después el botón de carga.
    const target = ['input:not([type=file])', 'textarea', 'select', '.tiptap', '.drop']
      .map((q) => document.querySelector<HTMLElement>(`${sel} ${q}`)).find(Boolean);
    target?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    target?.focus({ preventScroll: true });
  };

  const publish = async () => {
    if (errorKeys.length || publishing) return;
    setPublishing(true);
    try {
      await flush();
      setTrain(true);
      await store.publish(docId, rev.current);
      toast(`Publicado. El sitio se actualiza a las ${formatTime((await store.siteStatus()).nextBuildAt)}.`);
    } catch (e) {
      if (e instanceof ConflictError) setConflict(e.current); else toast((e as Error).message, 'error');
    } finally { setPublishing(false); }
  };

  const act = async (fn: () => Promise<unknown>, msg: string) => {
    try { await fn(); dirty.current = false; toast(msg); } catch (e) { toast((e as Error).message, 'error'); }
  };

  const reloadFromServer = () => {
    if (!conflict) return;
    dirty.current = false; rev.current = conflict.rev; setData(workingData(conflict)); setConflict(null);
  };

  const canPublish = !errorKeys.length && (state === 'draft' || state === 'changed');
  const firstMissing = errorKeys.length ? type.fields.find((f) => f.key === errorKeys[0])?.label : null;
  const published = state === 'waiting' || state === 'live';
  const buttonLabel = publishing
    ? <><span className="spinner" aria-hidden="true" />Publicando</>
    : published ? <>Publicado<Check className="lucide" aria-hidden="true" /></>
    : <>Publicar<ArrowRight className="lucide arrow" aria-hidden="true" /></>;

  return (
    <div className="editor-inner" style={{ ['--c' as string]: LINE_VAR[type.color] }}>
      <nav className="m-nav" aria-label="Navegación del contenido">
        <Link className="m-back" to={`/c/${type.id}`}><ArrowLeft className="lucide" aria-hidden="true" />Todos: {type.plural.toLowerCase()}</Link>
        <div className="m-types">
          {types.map((t) => <NavLink key={t.id} to={`/c/${t.id}`} style={{ ['--c' as string]: LINE_VAR[t.color] }}><i aria-hidden="true" />{t.plural}</NavLink>)}
        </div>
      </nav>

      <div className="crumbs">
        <span className="ln" aria-hidden="true" />{type.plural}<span aria-hidden="true">/</span>
        <span className={`saved ${savedAt ? 'flash' : ''}`} key={savedAt ?? 'x'} aria-live="polite">
          {saving ? 'Guardando…' : <><Check className="lucide" aria-hidden="true" />Guardado {formatTime(savedAt ?? doc.updatedAt)}</>}
        </span>
        <MenuTrigger>
          <Button className="icon-btn more" aria-label="Más acciones"><Ellipsis className="lucide" /></Button>
          <Popover placement="bottom end" offset={6}>
            <Menu className="menu-pop" onAction={(key) => {
              if (key === 'discard') void act(() => store.discardDraft(docId), 'Cambios descartados. Volviste a lo publicado.');
              if (key === 'unpublish') void act(() => store.unpublish(docId), 'Retirado del sitio. Queda como borrador.');
              if (key === 'duplicate') void store.duplicate(docId).then((d) => { toast('Copia creada como borrador.'); navigate(`/c/${type.id}/${d.id}`); });
              if (key === 'delete') setConfirmDelete(true);
            }}>
              <MenuItem id="discard" className="menu-item" isDisabled={state !== 'changed'}><Undo2 className="lucide" aria-hidden="true" />Descartar cambios</MenuItem>
              <MenuItem id="unpublish" className="menu-item" isDisabled={!doc.published}><RotateCcw className="lucide" aria-hidden="true" />Retirar del sitio</MenuItem>
              <MenuItem id="duplicate" className="menu-item"><Copy className="lucide" aria-hidden="true" />Duplicar</MenuItem>
              <MenuItem id="delete" className="menu-item danger"><Trash2 className="lucide" aria-hidden="true" />Eliminar</MenuItem>
            </Menu>
          </Popover>
        </MenuTrigger>
      </div>

      <h1 className={`doc-title ${title === 'Sin título' ? 'untitled' : ''}`}>{title}</h1>

      {conflict && (
        <div className="banner" role="alert">
          <TriangleAlert className="lucide" aria-hidden="true" />
          <div><strong>Otra pestaña guardó cambios en este documento</strong><span className="muted">Para no sobrescribirlos, recarga la versión guardada. Tus últimos cambios aquí se perderán.</span></div>
          <div className="acts"><button className="btn btn-primary btn-sm" type="button" onClick={reloadFromServer}>Recargar</button></div>
        </div>
      )}

      <Journey state={state} errors={errorKeys.length} doc={doc} nextBuildAt={site?.nextBuildAt ?? null} building={site?.building ?? false} train={train}>
        <button className="btn btn-primary" type="button" onClick={publish} disabled={publishing || !canPublish} aria-describedby={firstMissing ? 'missing-hint' : undefined}>
          {buttonLabel}
        </button>
        {firstMissing && (
          <button id="missing-hint" className="missing" type="button" onClick={goToMissing}>
            Falta: {firstMissing}{errorKeys.length > 1 ? ` y ${errorKeys.length - 1} más` : ''}
          </button>
        )}
      </Journey>

      <div className="grid2">
        {type.fields.filter((f) => !WIDE.includes(f.kind)).map((f) => (
          <Field key={f.key} def={f} value={current[f.key]} error={errors[f.key]} showError={showAll || touched.has(f.key) || Boolean(doc.published)} types={types}
            onChange={(v) => change(f.key, v)} onBlur={() => setTouched((t) => new Set(t).add(f.key))} />
        ))}
      </div>
      {type.fields.filter((f) => WIDE.includes(f.kind)).map((f) => (
        <Field key={f.key} def={f} value={current[f.key]} error={errors[f.key]} showError={showAll || touched.has(f.key)} types={types}
          onChange={(v) => change(f.key, v)} onBlur={() => setTouched((t) => new Set(t).add(f.key))} />
      ))}

      <ModalOverlay className="overlay" isOpen={confirmDelete} onOpenChange={setConfirmDelete} isDismissable>
        <Modal>
          <Dialog className="dialog" role="alertdialog">
            {({ close }) => (
              <>
                <Heading slot="title">¿Eliminar «{title}»?</Heading>
                <p className="muted">{doc.published ? 'También se quitará del sitio público en la próxima actualización. ' : ''}No se puede deshacer.</p>
                <div className="acts">
                  <button className="btn btn-ghost" type="button" onClick={close}>Cancelar</button>
                  <button className="btn btn-danger" type="button" onClick={async () => {
                    try { await store.deleteDocument(docId); close(); toast('Documento eliminado.'); navigate(`/c/${type.id}`); }
                    catch (e) { close(); toast((e as Error).message, 'error'); }
                  }}>Eliminar</button>
                </div>
              </>
            )}
          </Dialog>
        </Modal>
      </ModalOverlay>
    </div>
  );
}

function Journey({ state, errors, doc, nextBuildAt, building, train, children }: { state: DocState; errors: number; doc: CmsDocument; nextBuildAt: string | null; building: boolean; train: boolean; children: React.ReactNode }) {
  const reviewed = errors === 0;
  const done = Math.max(reviewed ? 1 : 0, stationsDone(state));
  const prevDone = useRef(done);
  const [arrived, setArrived] = useState<number | null>(null);
  useEffect(() => {
    if (done > prevDone.current) { setArrived(done); const t = setTimeout(() => setArrived(null), 600); prevDone.current = done; return () => clearTimeout(t); }
    prevDone.current = done;
  }, [done]);

  const live = state === 'live';
  const waiting = state === 'waiting';
  const stations = [
    { name: 'Borrador', note: `creado ${new Date(doc.createdAt).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' }).replace('.', '')}`, cls: 'done' },
    { name: 'Revisado', note: reviewed ? 'sin errores' : `falta${errors > 1 ? 'n' : ''} ${errors} campo${errors > 1 ? 's' : ''}`, cls: reviewed ? 'done' : 'now' },
    { name: 'Publicado', note: waiting || live ? `hoy ${formatTime(doc.publishedAt)}` : reviewed ? 'pulsa Publicar' : doc.publishedAt ? 'versión anterior' : 'aún no', cls: waiting || live ? 'done' : reviewed ? 'pending ready' : 'pending' },
    { name: 'En el sitio', note: live ? 'al día' : waiting ? (building ? 'actualizando…' : `próximo ${formatTime(nextBuildAt)}`) : doc.published ? 'versión anterior' : 'aún no', cls: live ? 'done' : waiting ? 'now' : 'pending' },
  ];
  const label = `Recorrido de publicación: ${stations.map((s) => `${s.name} ${s.cls === 'done' ? 'cumplido' : s.cls === 'now' ? 'actual' : 'pendiente'}`).join(', ')}.`;

  return (
    <section className={`journey ${train ? 'has-train' : ''}`} aria-label={label}>
      <div className="track" style={{ ['--p' as string]: done }}>
        <span className="fill" aria-hidden="true" />
        <span className="train" aria-hidden="true" />
        {stations.map((s, i) => (
          <div key={s.name} className={`stop ${s.cls} ${arrived === i ? 'arrive' : ''}`} aria-hidden="true">
            <span className="dot" /><strong>{s.name}</strong><small>{s.note}</small>
          </div>
        ))}
      </div>
      <div className="pub-wrap">{children}</div>
    </section>
  );
}
