import { ArrowDown, ArrowLeft, ArrowUp, FileUp, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { newId, slugKey } from '../data/domain';
import { useLive, useStore } from '../data/hooks';
import type { ContentType, FieldDef, FieldKind, LineColor } from '../data/types';
import { LINE_NAME, LINE_VAR, useToast } from '../components/ui';

export const KINDS: [FieldKind, string][] = [
  ['string', 'Texto corto'], ['text', 'Texto largo'], ['richtext', 'Texto con formato'],
  ['number', 'Número'], ['boolean', 'Sí / No'], ['image', 'Imagen'], ['reference', 'Enlace a otro contenido'],
];
const COLORS: LineColor[] = ['red', 'blue', 'green', 'amber', 'violet'];

function blankType(): ContentType {
  return { id: '', name: '', plural: '', color: 'violet', titleField: 'titulo', version: 0, fields: [{ key: 'titulo', label: 'Título', kind: 'string', required: true }] };
}

export function ModelsPage() {
  const { typeId } = useParams();
  const { data: types } = useLive((s) => s.listTypes(), []);
  return (
    <main className="page" id="main">
      <div className="page-inner">
        {typeId ? <TypeEditor key={typeId} typeId={typeId} types={types} /> : <TypeList types={types} />}
      </div>
    </main>
  );
}

function TypeList({ types }: { types?: ContentType[] }) {
  return (
    <>
      <h1>Tipos de contenido</h1>
      <p className="lead">Cada tipo es una línea del metro: define qué campos tiene un documento y cuáles son obligatorios para publicarlo.</p>
      <div className="cards">
        {!types && [0, 1, 2].map((i) => <div key={i} className="skeleton" />)}
        {types?.map((t) => (
          <Link key={t.id} className="type-row" to={`/modelos/${t.id}`} style={{ ['--c' as string]: LINE_VAR[t.color] }}>
            <span className="ln" aria-hidden="true" />
            <span><strong>{t.plural}</strong><br /><span className="muted">{t.fields.length} campos · {t.fields.filter((f) => f.required).length} obligatorios</span></span>
            <span className="mono muted">v{t.version}</span>
          </Link>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 'var(--cms-space-3)', flexWrap: 'wrap' }}>
        <Link className="btn btn-primary" to="/modelos/nuevo"><Plus className="lucide" aria-hidden="true" />Nuevo tipo</Link>
        <Link className="btn btn-secondary" to="/importar"><FileUp className="lucide" aria-hidden="true" />Importar desde Strapi, JSON o CSV</Link>
      </div>
    </>
  );
}

function TypeEditor({ typeId, types }: { typeId: string; types?: ContentType[] }) {
  const store = useStore();
  const toast = useToast();
  const navigate = useNavigate();
  const isNew = typeId === 'nuevo';
  const [draft, setDraft] = useState<ContentType | null>(isNew ? blankType() : null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isNew && types && !draft) setDraft(structuredClone(types.find((t) => t.id === typeId) ?? null));
  }, [types, typeId, isNew, draft]);

  if (!draft) return types ? <div className="empty"><strong>Este tipo no existe.</strong><Link className="btn btn-secondary" to="/modelos">Ver todos</Link></div> : <div className="skeleton" />;

  const setField = (i: number, patch: Partial<FieldDef>) => setDraft({ ...draft, fields: draft.fields.map((f, j) => (j === i ? { ...f, ...patch } : f)) });
  const move = (i: number, d: -1 | 1) => {
    const fields = [...draft.fields]; const [f] = fields.splice(i, 1); fields.splice(i + d, 0, f); setDraft({ ...draft, fields });
  };

  const save = async () => {
    const name = draft.name.trim();
    if (!name) { setError('Escribe el nombre del tipo, por ejemplo «Proyecto».'); return; }
    const keys = draft.fields.map((f) => f.key);
    if (draft.fields.some((f) => !f.label.trim())) { setError('Todos los campos necesitan un nombre.'); return; }
    if (new Set(keys).size !== keys.length) { setError('Hay dos campos con el mismo nombre. Cambia uno.'); return; }
    if (draft.fields.some((f) => f.kind === 'reference' && !f.refType)) { setError('Elige a qué contenido enlaza cada campo de enlace.'); return; }
    const id = isNew ? (types?.some((t) => t.id === slugKey(name)) ? newId(slugKey(name)) : slugKey(name)) : draft.id;
    const titleField = draft.fields.find((f) => f.kind === 'string')?.key ?? draft.fields[0]?.key ?? 'titulo';
    try {
      await store.saveType({ ...draft, id, name, plural: draft.plural.trim() || `${name}s`, titleField });
      toast(isNew ? `Tipo «${name}» creado. Ya aparece en el menú.` : 'Cambios guardados.');
      navigate(isNew ? `/c/${id}` : '/modelos');
    } catch (e) { setError((e as Error).message); }
  };

  return (
    <>
      <Link className="m-back" to="/modelos" style={{ display: 'inline-flex', marginBottom: 'var(--cms-space-5)' }}><ArrowLeft className="lucide" aria-hidden="true" />Todos los tipos</Link>
      <h1>{isNew ? 'Nuevo tipo de contenido' : draft.plural}</h1>
      <p className="lead">{isNew ? 'Ponle nombre, elige su color de línea y agrega los campos que tendrá cada documento.' : 'Los documentos existentes conservan sus datos; los campos nuevos empiezan vacíos.'}</p>

      <div className="panel">
        <h2>Nombre y color</h2>
        <div className="grid2">
          <div className="field"><label htmlFor="t-name">Nombre (singular)</label><div className="control"><input id="t-name" value={draft.name} placeholder="Ej.: Proyecto" onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></div></div>
          <div className="field"><label htmlFor="t-plural">Nombre en plural</label><div className="control"><input id="t-plural" value={draft.plural} placeholder="Ej.: Proyectos" onChange={(e) => setDraft({ ...draft, plural: e.target.value })} /></div></div>
        </div>
        <div className="field">
          <span className="label" id="t-color">Color de línea</span>
          <div className="swatches" role="radiogroup" aria-labelledby="t-color">
            {COLORS.map((c) => (
              <button key={c} type="button" role="radio" aria-checked={draft.color === c} className="swatch" style={{ ['--c' as string]: LINE_VAR[c] }} onClick={() => setDraft({ ...draft, color: c })}>
                <i aria-hidden="true" />{LINE_NAME[c]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="panel">
        <h2>Campos</h2>
        {draft.fields.map((f, i) => (
          <div className="field-row" key={i}>
            <div className="field"><label htmlFor={`f-l-${i}`}>Nombre del campo</label><div className="control"><input id={`f-l-${i}`} value={f.label} onChange={(e) => setField(i, { label: e.target.value, key: isNew || !types?.some((t) => t.id === draft.id && t.fields.some((x) => x.key === f.key)) ? slugKey(e.target.value) : f.key })} /></div></div>
            <div className="field"><label htmlFor={`f-k-${i}`}>Tipo</label><div className="control">
              <select id={`f-k-${i}`} value={f.kind} onChange={(e) => setField(i, { kind: e.target.value as FieldKind })}>{KINDS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
            </div></div>
            <label className="check" style={{ paddingBottom: 8 }}><input type="checkbox" checked={f.required} onChange={(e) => setField(i, { required: e.target.checked })} />Obligatorio</label>
            <div className="tools">
              <button className="icon-btn" type="button" aria-label={`Subir «${f.label}»`} disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp className="lucide" /></button>
              <button className="icon-btn" type="button" aria-label={`Bajar «${f.label}»`} disabled={i === draft.fields.length - 1} onClick={() => move(i, 1)}><ArrowDown className="lucide" /></button>
              <button className="icon-btn" type="button" aria-label={`Quitar «${f.label}»`} disabled={draft.fields.length === 1} onClick={() => setDraft({ ...draft, fields: draft.fields.filter((_, j) => j !== i) })}><Trash2 className="lucide" /></button>
            </div>
            {f.kind === 'reference' && (
              <div className="field" style={{ gridColumn: '1 / -1' }}><label htmlFor={`f-r-${i}`}>Enlaza a</label><div className="control">
                <select id={`f-r-${i}`} value={f.refType ?? ''} onChange={(e) => setField(i, { refType: e.target.value || undefined })}>
                  <option value="">Elige un tipo</option>
                  {types?.filter((t) => t.id !== draft.id).map((t) => <option key={t.id} value={t.id}>{t.plural}</option>)}
                </select></div></div>
            )}
          </div>
        ))}
        <button className="btn btn-secondary btn-sm" type="button" onClick={() => setDraft({ ...draft, fields: [...draft.fields, { key: `campo_${draft.fields.length + 1}`, label: '', kind: 'string', required: false }] })}>
          <Plus className="lucide" aria-hidden="true" />Agregar campo
        </button>
      </div>

      {error && <p className="err" role="alert" style={{ marginBottom: 'var(--cms-space-4)' }}>{error}</p>}
      <div style={{ display: 'flex', gap: 'var(--cms-space-3)' }}>
        <button className="btn btn-primary" type="button" onClick={save}>{isNew ? 'Crear tipo' : 'Guardar cambios'}</button>
        <Link className="btn btn-ghost" to="/modelos">Cancelar</Link>
      </div>
    </>
  );
}
