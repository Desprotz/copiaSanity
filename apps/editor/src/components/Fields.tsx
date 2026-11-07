import { useEditor, EditorContent, useEditorState } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Bold, Check, ImagePlus, Italic, List, RefreshCw, Trash2, TriangleAlert } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { ACCEPTED, optimizeImage } from '../data/assets-db';
import { docTitle } from '../data/domain';
import { useLive, useStore } from '../data/hooks';
import type { ContentType, FieldDef, ImageValue } from '../data/types';

interface FieldProps {
  def: FieldDef;
  value: unknown;
  error?: string;
  showError: boolean;
  onChange: (v: unknown) => void;
  onBlur: () => void;
  types: ContentType[];
}

const fmt = new Intl.NumberFormat('es-CO');

function NumberInput({ id, value, onChange, onBlur, invalid, describedBy, unit }: { id: string; value: unknown; onChange: (v: unknown) => void; onBlur: () => void; invalid: boolean; describedBy?: string; unit?: string }) {
  const toText = (v: unknown) => (typeof v === 'number' ? fmt.format(v) : '');
  const [text, setText] = useState(() => toText(value));
  const [focused, setFocused] = useState(false);
  useEffect(() => { if (!focused) setText(toText(value)); }, [value, focused]);
  return (
    <div className={`control ${unit ? 'has-unit' : ''}`}>
      <input
        id={id} inputMode="numeric" value={text} aria-invalid={invalid} aria-describedby={describedBy}
        onFocus={() => setFocused(true)}
        onChange={(e) => {
          setText(e.target.value);
          const digits = e.target.value.replace(/[^\d-]/g, '');
          onChange(digits === '' ? undefined : Number(digits));
        }}
        onBlur={() => { setFocused(false); onBlur(); }}
      />
      {unit && <span className="unit">{unit}</span>}
    </div>
  );
}

function RichText({ id, value, onChange, onBlur, labelId }: { id: string; value: unknown; onChange: (v: unknown) => void; onBlur: () => void; labelId: string }) {
  const editor = useEditor({
    extensions: [StarterKit.configure({ heading: false, codeBlock: false, code: false, horizontalRule: false })],
    content: typeof value === 'string' ? value : '',
    immediatelyRender: true,
    editorProps: { attributes: { id, 'aria-labelledby': labelId, role: 'textbox', 'aria-multiline': 'true' } },
    onUpdate: ({ editor: e }) => onChange(e.isEmpty ? '' : e.getHTML()),
    onBlur: () => onBlur(),
  });
  const marks = useEditorState({ editor, selector: ({ editor: e }) => ({ bold: e?.isActive('bold') ?? false, italic: e?.isActive('italic') ?? false, list: e?.isActive('bulletList') ?? false }) });
  return (
    <div className="rte">
      <div className="rte-bar" role="toolbar" aria-label="Formato del texto">
        <button className="icon-btn" type="button" aria-label="Negrita" aria-pressed={marks?.bold} onClick={() => editor?.chain().focus().toggleBold().run()}><Bold className="lucide" /></button>
        <button className="icon-btn" type="button" aria-label="Cursiva" aria-pressed={marks?.italic} onClick={() => editor?.chain().focus().toggleItalic().run()}><Italic className="lucide" /></button>
        <button className="icon-btn" type="button" aria-label="Lista" aria-pressed={marks?.list} onClick={() => editor?.chain().focus().toggleBulletList().run()}><List className="lucide" /></button>
      </div>
      <div className="rte-body"><EditorContent editor={editor} /></div>
    </div>
  );
}

function ReferenceSelect({ id, def, value, onChange, onBlur, types }: { id: string; def: FieldDef; value: unknown; onChange: (v: unknown) => void; onBlur: () => void; types: ContentType[] }) {
  const target = types.find((t) => t.id === def.refType);
  const { data: docs } = useLive((s) => s.listDocuments(def.refType), [def.refType]);
  const current = docs?.find((d) => d.id === value);
  return (
    <div className="control">
      <select id={id} value={typeof value === 'string' ? value : ''} onChange={(e) => onChange(e.target.value || undefined)} onBlur={onBlur}>
        <option value="">Sin asignar</option>
        {docs?.map((d) => <option key={d.id} value={d.id}>{docTitle(target, d)}{d.published ? '' : ' (sin publicar)'}</option>)}
      </select>
      {current && !current.published && <span className="help">Este {target?.name.toLowerCase()} todavía no está publicado: en el sitio no aparecerá enlazado.</span>}
    </div>
  );
}

export function StoredImage({ assetId, alt, className }: { assetId: string; alt: string; className?: string }) {
  const { data: url } = useLive((s) => s.imageUrl(assetId), [assetId]);
  if (url === undefined) return <div className={`img-missing ${className ?? ''}`}>Imagen no disponible en este navegador</div>;
  return <img className={className} src={url} alt={alt} />;
}

function ImageField({ id, def, value, onChange, onBlur, labelId, describedBy }: { id: string; def: FieldDef; value: unknown; onChange: (v: unknown) => void; onBlur: () => void; labelId: string; describedBy?: string }) {
  const store = useStore();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);
  const [problem, setProblem] = useState('');
  const [info, setInfo] = useState('');
  const img = value && typeof value === 'object' && 'assetId' in value ? (value as ImageValue) : null;

  const take = async (file: File | undefined) => {
    if (!file) return;
    setProblem(''); setBusy(true);
    try {
      const { blob, width, height } = await optimizeImage(file);
      const asset = await store.uploadImage(blob, { width, height, originalName: file.name });
      setInfo(`${width} × ${height} px · ${Math.round(blob.size / 1024)} KB (antes ${Math.round(file.size / 1024)} KB)`);
      onChange({ assetId: asset.id, alt: img?.alt ?? '' } satisfies ImageValue);
    } catch (e) { setProblem((e as Error).message); }
    finally { setBusy(false); if (input.current) input.current.value = ''; }
  };

  const picker = <input ref={input} id={id} type="file" accept={ACCEPTED.join(',')} className="sr-only" tabIndex={-1} aria-labelledby={labelId} onChange={(e) => void take(e.target.files?.[0])} />;

  if (!img) {
    return (
      <>
        {picker}
        <button type="button" className={`drop ${over ? 'over' : ''}`} disabled={busy} aria-describedby={describedBy}
          onClick={() => input.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
          onDrop={(e) => { e.preventDefault(); setOver(false); void take(e.dataTransfer.files[0]); }}>
          <span className="ic">{busy ? <span className="spinner" aria-hidden="true" /> : <ImagePlus className="lucide" aria-hidden="true" />}</span>
          <span><strong>{busy ? 'Optimizando la imagen…' : 'Arrastra una foto o elige un archivo'}</strong><span className="help">{def.help ?? 'JPG, PNG o WebP de hasta 20 MB.'}</span></span>
        </button>
        {problem && <span className="err" role="alert"><TriangleAlert className="lucide" aria-hidden="true" />{problem}</span>}
      </>
    );
  }
  return (
    <div className="img-field">
      {picker}
      <StoredImage assetId={img.assetId} alt={img.alt} className="img-preview" />
      <div className="img-side">
        {info && <span className="help">{info}</span>}
        <div className="img-acts">
          <button type="button" className="btn btn-secondary btn-sm" disabled={busy} onClick={() => input.current?.click()}>{busy ? <span className="spinner" aria-hidden="true" /> : <RefreshCw className="lucide" aria-hidden="true" />}Reemplazar</button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => onChange(undefined)}><Trash2 className="lucide" aria-hidden="true" />Quitar</button>
        </div>
        <label className="label" htmlFor={`${id}-alt`}>Describe la foto</label>
        <div className="control">
          <input id={`${id}-alt`} value={img.alt} placeholder="Ej.: Fachada blanca con patio y un árbol de mango" aria-describedby={describedBy}
            onChange={(e) => onChange({ ...img, alt: e.target.value })} onBlur={onBlur} />
        </div>
        {problem && <span className="err" role="alert"><TriangleAlert className="lucide" aria-hidden="true" />{problem}</span>}
      </div>
    </div>
  );
}

export function Field({ def, value, error, showError, onChange, onBlur, types }: FieldProps) {
  const id = useId();
  const errId = `${id}-err`;
  const labelId = `${id}-label`;
  const invalid = Boolean(error && showError);
  const valid = !error && value !== undefined && value !== '' && def.kind !== 'boolean' && def.kind !== 'richtext' && def.kind !== 'image';
  const label = (
    <>{def.label}{!def.required && <span className="opt"> (opcional)</span>}</>
  );

  let control;
  switch (def.kind) {
    case 'number':
      control = <NumberInput id={id} value={value} onChange={onChange} onBlur={onBlur} invalid={invalid} describedBy={invalid ? errId : undefined} unit={def.unit} />;
      break;
    case 'text':
      control = <div className="control"><textarea id={id} value={typeof value === 'string' ? value : ''} onChange={(e) => onChange(e.target.value)} onBlur={onBlur} aria-invalid={invalid} aria-describedby={invalid ? errId : undefined} /></div>;
      break;
    case 'richtext':
      control = <RichText id={id} value={value} onChange={onChange} onBlur={onBlur} labelId={labelId} />;
      break;
    case 'boolean':
      return (
        <div className="field">
          <label className="check"><input type="checkbox" checked={value === true} onChange={(e) => onChange(e.target.checked)} />{def.label}</label>
          {def.help && <span className="help">{def.help}</span>}
        </div>
      );
    case 'image':
      control = <ImageField id={id} def={def} value={value} onChange={onChange} onBlur={onBlur} labelId={labelId} describedBy={invalid ? errId : undefined} />;
      break;
    case 'reference':
      control = <ReferenceSelect id={id} def={def} value={value} onChange={onChange} onBlur={onBlur} types={types} />;
      break;
    default:
      control = (
        <div className="control">
          <input id={id} value={typeof value === 'string' ? value : ''} onChange={(e) => onChange(e.target.value)} onBlur={onBlur} aria-invalid={invalid} aria-describedby={invalid ? errId : undefined} />
          {valid && <Check className="lucide" aria-hidden="true" style={{ position: 'absolute', right: 12, top: 12, color: 'var(--cms-color-success)' }} />}
        </div>
      );
  }

  return (
    <div className={`field ${invalid ? 'invalid' : ''}`} data-field={def.key}>
      {def.kind === 'richtext' || def.kind === 'image' ? <span className="label" id={labelId}>{label}</span> : <label htmlFor={id}>{label}</label>}
      {control}
      {def.help && def.kind !== 'image' && <span className="help">{def.help}</span>}
      {invalid && <span className="err" id={errId}><TriangleAlert className="lucide" aria-hidden="true" />{error}</span>}
    </div>
  );
}
