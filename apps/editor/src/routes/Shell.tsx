import { ChevronDown, Moon, Sun, User } from 'lucide-react';
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

export function Shell() {
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
    navigate('/c/propiedad');
  };

  return (
    <div className="app">
      <a className="skip" href="#main">Saltar al contenido</a>
      <header className="topbar">
        <img className="logo" src="/logo-mse-blanco.svg" alt="MSE" width={81} height={22} />
        <span className="project"><strong>Portal de prueba</strong><span className="env">local</span><ChevronDown className="lucide" aria-hidden="true" /></span>
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
        <div className="foot"><button type="button" onClick={reset}>Restaurar datos de prueba</button></div>
      </nav>
      <Outlet />
    </div>
  );
}
