import { Navigate } from 'react-router';
import { useLive } from '../data/hooks';

/** Al entrar a un sitio, abre su primer tipo de contenido (cada sitio tiene los suyos). */
export function FirstType() {
  const { data: types } = useLive((s) => s.listTypes(), []);
  if (!types) return <main className="editor" id="main"><div className="editor-inner"><div className="skeleton" /></div></main>;
  if (!types.length) return <Navigate to="/modelos/nuevo" replace />;
  return <Navigate to={`/c/${types[0].id}`} replace />;
}
