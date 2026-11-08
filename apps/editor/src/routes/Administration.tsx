import { NavLink, Outlet } from 'react-router';
import { useAuth } from './Login';

export function Administration() {
  const auth = useAuth();
  return <div className="administration">
    <header className="topbar"><img src="/logo-mse-blanco.svg" alt="MSE" width={81} height={22} /><strong>Administración general</strong><NavLink className="btn btn-secondary" to="/">Ir a proyectos</NavLink></header>
    <nav className="admin-nav" aria-label="Administración general"><NavLink to="/usuarios">Usuarios</NavLink><NavLink to="/asignaciones">Asignar proyectos</NavLink><button className="btn btn-ghost" onClick={() => void auth?.logout()}>Cerrar sesión</button></nav>
    <Outlet />
  </div>;
}
