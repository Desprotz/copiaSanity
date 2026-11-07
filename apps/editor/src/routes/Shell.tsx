import { Check, ChevronDown, Moon, Plus, Sun, User } from 'lucide-react';
import { Button, Dialog, Heading, Menu, MenuItem, MenuTrigger, Modal, ModalOverlay, Popover, Separator } from 'react-aria-components';
import { useSites } from '../data/sites';
import { SEED_SITES } from '../data/seed';

/** Solo los sitios de prueba (y el modo sin conexión) se pueden restaurar. */
const DEMO_IDS = ['local', ...SEED_SITES.map((s) => s.id)];
import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router';
import { formatTime } from '../data/domain';
import { useLive, useStore } from '../data/hooks';
import { LINE_VAR, useToast } from '../components/ui';

function isDark() {
  const t = document.documentElement.dataset.theme;
  return t ? t === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
}

export function SiteBeacon() {
  const store = useStore();
  const toast = useToast();
  const { data: s } = useLive((st) => st.siteStatus(), []);
  if (!s) return <span className="beacon-btn" aria-hidden="true"><span className="beacon calm" /></span>;
  const tone = s.building ? 'building' : s.pending ? '' : 'calm';
  const long = s.building ? 'Actualizando el sitio…' : s.pending ? `${s.pending} ${s.pending === 1 ? 'cambio esperando' : 'cambios esperando'}` : 'Sitio al día';
  const short = s.building ? 'actualizando' : s.pending ? `${s.pending} en espera` : 'al día';
  const time = s.building ? '' : s.pending ? `próximo al sitio ${formatTime(s.nextBuildAt)}` : s.lastBuiltAt ? `compilado ${formatTime(s.lastBuiltAt)}` : '';
  const onClick = async () => {
    if (s.pending && !s.building) { await store.buildSiteNow(); toast('El sitio público ya muestra los cambios.'); }
    else window.open('/sitio', '_blank', 'noopener');
  };
  return (
    <button type="button" className="beacon-btn" onClick={onClick} title={s.pending ? 'Actualizar el sitio ahora' : 'Abrir el sitio publicado'} aria-live="polite">
      <span className={`beacon ${tone}`} aria-hidden="true" />
      <span className="long">{long}</span>
      <span className="short" aria-hidden="true">{short}</span>
      {time && <span className="t mono">{time}</span>}
    </button>
  );
}

function SiteSwitcher() {
  const { sites, site, multi, select, create } = useSites();
  const navigate = useNavigate();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const env = multi ? 'Neon' : 'este navegador';
  const go = (id: string) => { if (id !== site?.id) { select(id); navigate('/'); } };
  const submit = async () => {
    if (!name.trim()) { setErr('Escribe el nombre de la web, por ejemplo «Panadería El Trigo».'); return; }
    setBusy(true);
    try { const s = await create(name); setOpen(false); setName(''); setErr(''); navigate('/'); toast(`Sitio «${s.name}» creado. Empieza definiendo sus tipos de contenido.`); }
    catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  };
  return (
    <>
      <MenuTrigger>
        <Button className="project" aria-label={`Sitio actual: ${site?.name ?? ''}. Cambiar de sitio`}>
          <strong>{site?.name}</strong><span className="env" title={multi ? 'Datos en la base de Neon' : 'Datos guardados solo en este navegador'}>{env}</span><ChevronDown className="lucide" aria-hidden="true" />
        </Button>
        <Popover placement="bottom start" offset={6}>
          <Menu className="menu-pop" aria-label="Tus sitios" onAction={(key) => { if (key === '__new') setOpen(true); else go(String(key)); }}>
            {sites.map((s) => (
              <MenuItem key={s.id} id={s.id} className="menu-item" textValue={s.name}>
                <span className="site-dot" aria-hidden="true">{s.name.slice(0, 1).toUpperCase()}</span>{s.name}
                {s.id === site?.id && <Check className="lucide" aria-label="actual" style={{ marginLeft: 'auto' }} />}
              </MenuItem>
            ))}
            {multi && <Separator className="menu-sep" />}
            {multi && <MenuItem id="__new" className="menu-item" textValue="Nuevo sitio"><Plus className="lucide" aria-hidden="true" />Nuevo sitio…</MenuItem>}
          </Menu>
        </Popover>
      </MenuTrigger>
      <ModalOverlay className="overlay" isOpen={open} onOpenChange={setOpen} isDismissable>
        <Modal>
          <Dialog className="dialog">
            <Heading slot="title">Nuevo sitio</Heading>
            <p className="muted">Cada sitio es una web con sus propios tipos de contenido, documentos y fotos. Lo de un sitio nunca aparece en otro.</p>
            <form onSubmit={(e) => { e.preventDefault(); void submit(); }}>
              <div className="field" style={{ marginTop: 'var(--cms-space-5)' }}>
                <label htmlFor="site-name">Nombre de la web</label>
                <div className="control"><input id="site-name" autoFocus value={name} placeholder="Ej.: Panadería El Trigo" maxLength={80} onChange={(e) => setName(e.target.value)} /></div>
                {err && <span className="err" role="alert">{err}</span>}
              </div>
              <div className="acts">
                <button className="btn btn-ghost" type="button" onClick={() => setOpen(false)}>Cancelar</button>
                <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? <span className="spinner" aria-hidden="true" /> : null}Crear sitio</button>
              </div>
            </form>
          </Dialog>
        </Modal>
      </ModalOverlay>
    </>
  );
}

export function Shell() {
  const { site } = useSites();
  const store = useStore();
  const navigate = useNavigate();
  const toast = useToast();
  const { data: types } = useLive((s) => s.listTypes(), []);
  const { data: docs } = useLive((s) => s.listDocuments(), []);
  const [dark, setDark] = useState(isDark);

  useEffect(() => { document.title = 'Editor MSE'; }, []);

  const toggleTheme = () => {
    const next = isDark() ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('cms.theme', next); } catch { /* sin almacenamiento */ }
    setDark(next === 'dark');
  };

  const reset = async () => {
    if (!window.confirm('¿Volver a los datos de prueba? Se pierden los cambios hechos en este navegador.')) return;
    await store.resetDemo();
    toast('Datos de prueba restaurados.');
    navigate('/');
  };

  return (
    <div className="app">
      <a className="skip" href="#main">Saltar al contenido</a>
      <header className="topbar">
        <img className="logo" src="/logo-mse-blanco.svg" alt="MSE" width={81} height={22} />
        <SiteSwitcher />
        <SiteBeacon />
        <button className="icon-btn" type="button" onClick={toggleTheme} aria-label={dark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}>
          {dark ? <Sun className="lucide" /> : <Moon className="lucide" />}
        </button>
        <button className="icon-btn account" type="button" aria-label="Tu cuenta"><User className="lucide" /></button>
      </header>
      <nav className="rail" aria-label="Contenido">
        <h2>Contenido</h2>
        {types?.map((t) => (
          <NavLink key={t.id} className="route" to={`/c/${t.id}`} style={{ ['--c' as string]: LINE_VAR[t.color] }}>
            <span className="ln" aria-hidden="true" />
            <span className="lbl">{t.plural}</span>
            <span className="n mono">{docs?.filter((d) => d.typeId === t.id).length ?? ''}</span>
          </NavLink>
        ))}
        <h2>Proyecto</h2>
        <NavLink className="route" to="/modelos" style={{ ['--c' as string]: 'var(--cms-color-shell-muted)' }}>
          <span className="ln" aria-hidden="true" /><span className="lbl">Tipos de contenido</span>
        </NavLink>
        <a className="route" href="/sitio" target="_blank" rel="noopener" style={{ ['--c' as string]: 'var(--cms-color-shell-muted)' }}>
          <span className="ln" aria-hidden="true" /><span className="lbl">Ver el sitio</span>
        </a>
        {(!site || DEMO_IDS.includes(site.id)) && <div className="foot"><button type="button" onClick={reset}>Restaurar datos de prueba</button></div>}
      </nav>
      <Outlet />
    </div>
  );
}
