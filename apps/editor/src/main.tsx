import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router';
import './styles/app.css';
import { SitesProvider } from './data/sites';
import { AuthGate } from './routes/Login';
import { FirstType } from './routes/FirstType';
import { ToastProvider } from './components/ui';
import { Shell } from './routes/Shell';
import { ContentPage } from './routes/ContentPage';
import { ModelsPage } from './routes/ModelsPage';
import { SitePage } from './routes/SitePage';
import { ImportPage } from './routes/ImportPage';
import { ApiAccessPage } from './routes/ApiAccessPage';
import { UsersPage } from './routes/UsersPage';
import { SiteSettingsPage } from './routes/SiteSettingsPage';
import { Administration } from './routes/Administration';
import { AssignmentsPage } from './routes/AssignmentsPage';

// Tema: el sistema decide salvo que la persona haya elegido otro.
try {
  const t = localStorage.getItem('cms.theme');
  if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t;
} catch { /* sin almacenamiento */ }

// VITE_DATA_SOURCE=api usa el API (apps/api + Neon, varios sitios); cualquier otro valor guarda en este navegador.
const USE_API = import.meta.env.VITE_DATA_SOURCE === 'api';

const router = createBrowserRouter([
  {
    path: '/',
    element: <SitesProvider api={USE_API}><Shell /></SitesProvider>,
    children: [
      { index: true, element: <FirstType /> },
      { path: 'c/:typeId', element: <ContentPage /> },
      { path: 'c/:typeId/:docId', element: <ContentPage /> },
      { path: 'modelos', element: <ModelsPage /> },
      { path: 'modelos/:typeId', element: <ModelsPage /> },
      { path: 'importar', element: <ImportPage /> },
      { path: 'acceso', element: <ApiAccessPage /> },
      { path: 'ver-sitio', element: <SiteSettingsPage /> },
    ],
  },
  { element: <Administration />, children: [
    { path: '/usuarios', element: <UsersPage /> },
    { path: '/asignaciones', element: <AssignmentsPage /> },
  ] },
  { path: '/sitio', element: <SitesProvider api={USE_API}><SitePage /></SitesProvider> },
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      {USE_API ? (
        <AuthGate>
            <RouterProvider router={router} />
        </AuthGate>
      ) : (
          <RouterProvider router={router} />
      )}
    </ToastProvider>
  </StrictMode>,
);
