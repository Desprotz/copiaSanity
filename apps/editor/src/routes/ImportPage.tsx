import { ArrowLeft, FileUp, TriangleAlert, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { Link } from 'react-router';
import { useLive, useStore } from '../data/hooks';
import { applySchemas, buildPlan, chunkPlan, finalizeEntities, parseFile, refreshWarnings, retarget, titleColumn, type ImportColumn, type ImportEntity, type ParsedFile } from '../data/import';
import type { ContentType, FieldKind } from '../data/types';
import { useToast } from '../components/ui';
import { KINDS } from './ModelsPage';

const MAX_FILE = 20 * 1024 * 1024;

interface Done { types: { id: string; plural: string }[]; created: number; published: number }

export function ImportPage() {
  const store = useStore();
  const toast = useToast();
  const { data: types } = useLive((s) => s.listTypes(), []);
  const [parsed, setParsed] = useState<ParsedFile[]>([]);
  const [entities, setEntities] = useState<ImportEntity[]>([]);
  const [publish, setPublish] = useState(false);
  const [over, setOver] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState('');
  const [done, setDone] = useState<Done | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const addFiles = async (list: FileList | null) => {
    if (!list?.length) return;
    const read: ParsedFile[] = [];
    for (const f of Array.from(list)) {
      if (!/\.(json|csv|tsv)$/i.test(f.name)) { read.push({ file: f.name, entities: [], schemas: [], error: 'Solo se aceptan archivos .json o .csv.' }); continue; }
      if (f.size > MAX_FILE) { read.push({ file: f.name, entities: [], schemas: [], error: 'Pesa más de 20 MB. Pártelo en varios archivos.' }); continue; }
      read.push(parseFile(f.name, await f.text()));
    }
    // Se recalcula la propuesta con todos los archivos: así un schema.json o una colección relacionada se tienen en cuenta.
    const all = [...parsed.filter((p) => !read.some((r) => r.file === p.file)), ...read];
    setParsed(all);
    const fresh = structuredClone(all);
    setEntities(finalizeEntities(applySchemas(fresh.flatMap((p) => p.entities), fresh.flatMap((p) => p.schemas))));
    setError(''); setDone(null);
    if (input.current) input.current.value = '';
  };

  const update = (i: number, next: ImportEntity) => { refreshWarnings(next); setEntities(entities.map((e, j) => (j === i ? next : e))); };
  const setCol = (i: number, k: number, patch: Partial<ImportColumn>) => {
    const e = entities[i];
    update(i, { ...e, columns: e.columns.map((c, j) => (j === k ? { ...c, ...patch } : c)) });
  };
  const remove = (i: number) => setEntities(entities.filter((_, j) => j !== i));
  const reset = () => { setParsed([]); setEntities([]); setError(''); setDone(null); };

  const totalDocs = entities.reduce((n, e) => n + e.records.length, 0);
  const newTypes = entities.filter((e) => e.target === 'new').length;

  const run = async () => {
    if (!types) return;
    for (const e of entities) {
      const cols = e.columns.filter((c) => c.include);
      if (e.target === 'new' && !e.name.trim()) { setError(`Escribe un nombre para la colección de «${e.file}».`); return; }
      if (!cols.length) { setError(`«${e.plural}» no tiene ningún campo marcado.`); return; }
      if (cols.length > 60) { setError(`«${e.plural}» tiene más de 60 campos marcados.`); return; }
      if (e.target !== 'new' && entities.filter((x) => x.target === e.target).length > 1) { setError('Dos colecciones apuntan al mismo tipo existente. Elige destinos distintos.'); return; }
    }
    const plan = buildPlan(entities, types, publish);
    const batches = chunkPlan(plan);
    setError(''); setProgress({ done: 0, total: plan.documents.length });
    let created = 0; let published = 0;
    try {
      for (const b of batches) {
        const r = await store.importContent(b);
        created += r.created; published += r.published;
        setProgress({ done: created, total: plan.documents.length });
      }
      const touched = [...new Set(plan.documents.map((d) => d.typeId).concat(plan.types.map((t) => t.id)))];
      const names = new Map([...types, ...plan.types].map((t) => [t.id, t.plural]));
      setDone({ types: touched.map((id) => ({ id, plural: names.get(id) ?? id })), created, published });
      setParsed([]); setEntities([]);
      toast(`Importación lista: ${created} ${created === 1 ? 'documento' : 'documentos'}.`);
    } catch (e) {
      setError(created
        ? `Se guardaron ${created} de ${plan.documents.length} documentos y luego falló: ${(e as Error).message} Revisa lo importado antes de reintentar para no duplicar.`
        : (e as Error).message);
    } finally { setProgress(null); }
  };

  return (
    <main className="page" id="main">
      <div className="page-inner">
        <Link className="m-back" to="/modelos" style={{ display: 'inline-flex', marginBottom: 'var(--cms-space-5)' }}><ArrowLeft className="lucide" aria-hidden="true" />Tipos de contenido</Link>
        <h1>Importar datos</h1>
        <p className="lead">Trae colecciones y su contenido desde Strapi u otro sistema. Revisas la propuesta de tipos y campos antes de guardar nada.</p>

        {done && (
          <div className="panel">
            <h2>Importación terminada</h2>
            <p>Se crearon <strong>{done.created}</strong> {done.created === 1 ? 'documento' : 'documentos'}{done.published ? <>, <strong>{done.published}</strong> ya publicados</> : ''}{done.created - done.published ? <> y <strong>{done.created - done.published}</strong> en borrador</> : ''}.</p>
            {publish && done.created > done.published && <p className="muted">Los borradores tenían campos obligatorios vacíos: complétalos y publícalos desde cada documento.</p>}
            <div className="imp-links">
              {done.types.map((t) => <Link key={t.id} className="btn btn-secondary btn-sm" to={`/c/${t.id}`}>Ver {t.plural}</Link>)}
              <button className="btn btn-ghost btn-sm" type="button" onClick={reset}>Importar otros archivos</button>
            </div>
          </div>
        )}

        <input ref={input} type="file" accept=".json,.csv,.tsv,application/json,text/csv" multiple className="sr-only" tabIndex={-1} aria-label="Archivos para importar" onChange={(e) => void addFiles(e.target.files)} />
        <button type="button" className={`drop ${over ? 'over' : ''}`} style={{ marginBottom: 'var(--cms-space-5)' }} disabled={Boolean(progress)}
          onClick={() => input.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
          onDrop={(e) => { e.preventDefault(); setOver(false); void addFiles(e.dataTransfer.files); }}>
          <span className="ic"><FileUp className="lucide" aria-hidden="true" /></span>
          <span><strong>{entities.length ? 'Agregar más archivos' : 'Arrastra archivos .json o .csv, o elígelos'}</strong><span className="help">Puedes subir varios a la vez: una colección por archivo, o un JSON con varias.</span></span>
        </button>

        <details className="imp-help">
          <summary>¿Cómo saco los datos de Strapi?</summary>
          <ol>
            <li><strong>Contenido:</strong> pide cada colección a la API REST de Strapi y guarda la respuesta como <code>.json</code>, por ejemplo <code>/api/articles?populate=*&amp;pagination[pageSize]=100</code>. Si hay más páginas, sube cada una: se juntan solas.</li>
            <li><strong>Estructura (opcional):</strong> sube también los <code>schema.json</code> de <code>src/api/*/content-types/</code>. Con ellos se respetan los campos obligatorios y las relaciones.</li>
            <li><strong>Relaciones:</strong> importa juntas las colecciones relacionadas (artículos y autores) para que los enlaces se conserven.</li>
            <li><strong>CSV:</strong> la primera fila son los nombres de columna; sirve el separador «,» o «;».</li>
          </ol>
        </details>

        {parsed.filter((p) => p.error).map((p) => (
          <div key={p.file} className="banner danger" role="alert"><TriangleAlert className="lucide" aria-hidden="true" /><div><strong>{p.file}</strong>{p.error}</div></div>
        ))}
        {parsed.length > 0 && !entities.length && !parsed.some((p) => p.error) && (
          <div className="banner"><TriangleAlert className="lucide" aria-hidden="true" /><div><strong>No hay datos que importar</strong>Los archivos no tienen registros. Si solo subiste schema.json, agrega también los datos.</div></div>
        )}

        {entities.map((e, i) => (
          <EntityPanel key={`${e.id}-${i}`} entity={e} entities={entities} types={types ?? []} onChange={(n) => update(i, n)} onCol={(k, p) => setCol(i, k, p)} onRemove={() => remove(i)} />
        ))}

        {entities.length > 0 && (
          <div className="panel">
            <h2>Guardar</h2>
            <p>Se {newTypes === 1 ? 'creará 1 tipo nuevo' : `crearán ${newTypes} tipos nuevos`} y <strong>{totalDocs}</strong> {totalDocs === 1 ? 'documento' : 'documentos'}. Siempre se crean documentos nuevos: no se reemplaza nada de lo que ya tienes.</p>
            <label className="check" style={{ margin: 'var(--cms-space-4) 0' }}>
              <input type="checkbox" checked={publish} onChange={(e) => setPublish(e.target.checked)} />
              Publicar los que estén completos (el resto queda en borrador)
            </label>
            {progress && (
              <div className="imp-progress" role="progressbar" aria-valuemin={0} aria-valuemax={progress.total} aria-valuenow={progress.done} aria-label="Progreso de la importación">
                <span style={{ width: `${progress.total ? (progress.done / progress.total) * 100 : 100}%` }} />
              </div>
            )}
            {error && <p className="err" role="alert" style={{ marginBottom: 'var(--cms-space-4)' }}><TriangleAlert className="lucide" aria-hidden="true" />{error}</p>}
            <div style={{ display: 'flex', gap: 'var(--cms-space-3)', flexWrap: 'wrap' }}>
              <button className="btn btn-primary" type="button" disabled={Boolean(progress) || !types} onClick={() => void run()}>
                {progress ? <><span className="spinner" aria-hidden="true" />Importando {progress.done} de {progress.total}…</> : `Importar ${totalDocs} ${totalDocs === 1 ? 'documento' : 'documentos'}`}
              </button>
              <button className="btn btn-ghost" type="button" disabled={Boolean(progress)} onClick={reset}>Descartar</button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function EntityPanel({ entity: e, entities, types, onChange, onCol, onRemove }: {
  entity: ImportEntity; entities: ImportEntity[]; types: ContentType[];
  onChange: (e: ImportEntity) => void; onCol: (k: number, patch: Partial<ImportColumn>) => void; onRemove: () => void;
}) {
  const uid = `imp-${e.id}`;
  const title = titleColumn(e);
  const target = types.find((t) => t.id === e.target);
  return (
    <section className="panel" aria-labelledby={`${uid}-h`}>
      <div className="imp-head">
        <div>
          <h2 id={`${uid}-h`}>{e.plural || e.name}</h2>
          <p className="muted">{e.records.length} {e.records.length === 1 ? 'registro' : 'registros'} · <span className="mono">{e.file}</span></p>
        </div>
        <button className="icon-btn" type="button" aria-label={`No importar «${e.plural}»`} onClick={onRemove}><X className="lucide" /></button>
      </div>

      <div className="grid2">
        <div className="field">
          <label htmlFor={`${uid}-t`}>Guardar en</label>
          <div className="control">
            <select id={`${uid}-t`} value={e.target} onChange={(ev) => onChange(retarget(e, ev.target.value, types))}>
              <option value="new">Un tipo nuevo</option>
              {types.map((t) => <option key={t.id} value={t.id}>{t.plural} (ya existe)</option>)}
            </select>
          </div>
        </div>
        {e.target === 'new' ? (
          <div className="field">
            <label htmlFor={`${uid}-n`}>Nombre del tipo (singular)</label>
            <div className="control"><input id={`${uid}-n`} value={e.name} maxLength={80} onChange={(ev) => onChange({ ...e, name: ev.target.value })} /></div>
          </div>
        ) : <p className="muted" style={{ alignSelf: 'center' }}>Las columnas que coinciden con un campo de «{target?.plural}» lo usan; las demás se agregan como campos nuevos.</p>}
        {e.target === 'new' && (
          <div className="field">
            <label htmlFor={`${uid}-p`}>Nombre en plural</label>
            <div className="control"><input id={`${uid}-p`} value={e.plural} maxLength={80} onChange={(ev) => onChange({ ...e, plural: ev.target.value })} /></div>
          </div>
        )}
      </div>

      {e.warnings.map((w) => (
        <div key={w} className="banner"><TriangleAlert className="lucide" aria-hidden="true" /><div>{w}</div></div>
      ))}

      <div className="imp-cols" role="table" aria-label={`Campos de «${e.plural}»`}>
        <div className="imp-row imp-th" role="row">
          <span role="columnheader">Importar</span><span role="columnheader">Nombre del campo</span><span role="columnheader">Clase</span><span role="columnheader">Obligatorio</span><span role="columnheader">Ejemplo</span>
        </div>
        {e.columns.map((c, k) => (
          <div key={c.source} className={`imp-row ${c.include ? '' : 'off'}`} role="row">
            <label className="check" role="cell">
              <input type="checkbox" checked={c.include} onChange={(ev) => onCol(k, { include: ev.target.checked })} aria-label={`Importar «${c.source}»`} />
              <span className="mono imp-src" title={c.source}>{c.source}</span>
            </label>
            <div className="control" role="cell">
              <input value={c.label} maxLength={80} disabled={!c.include || c.existing} aria-label={`Nombre del campo para «${c.source}»`} onChange={(ev) => onCol(k, { label: ev.target.value })} />
            </div>
            <div role="cell" className="imp-kind">
              <div className="control">
                <select value={c.kind} disabled={!c.include || c.existing} aria-label={`Clase de «${c.source}»`} onChange={(ev) => onCol(k, { kind: ev.target.value as FieldKind })}>
                  {KINDS.filter(([kind]) => kind !== 'image' || c.kind === 'image').map(([kind, l]) => <option key={kind} value={kind}>{l}</option>)}
                </select>
              </div>
              {c.kind === 'reference' && c.include && !c.existing && (
                <div className="control">
                  <select value={c.refEntity ?? ''} aria-label={`A qué colección enlaza «${c.source}»`} onChange={(ev) => onCol(k, { refEntity: ev.target.value || undefined })}>
                    <option value="">Elige la colección…</option>
                    {entities.map((x) => <option key={x.id} value={x.id}>{x.plural}</option>)}
                  </select>
                </div>
              )}
              {c.existing && <span className="help">campo existente</span>}
            </div>
            <label className="check" role="cell">
              <input type="checkbox" checked={c.required} disabled={!c.include || c.existing} onChange={(ev) => onCol(k, { required: ev.target.checked })} aria-label={`«${c.label}» obligatorio`} />
              {c === title && e.target === 'new' && <span className="help">título</span>}
            </label>
            <span className="muted imp-sample" role="cell" title={c.sample}>{c.sample || '—'}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
