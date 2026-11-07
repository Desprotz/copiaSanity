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
    element: <Shell />,
    children: [
      { index: true, element: <FirstType /> },
      { path: 'c/:typeId', element: <ContentPage /> },
      { path: 'c/:typeId/:docId', element: <ContentPage /> },
      { path: 'modelos', element: <ModelsPage /> },
      { path: 'modelos/:typeId', element: <ModelsPage /> },
    ],
  },
  { path: '/sitio', element: <SitePage /> },
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      {USE_API ? (
        <AuthGate>
          <SitesProvider api>
            <RouterProvider router={router} />
          </SitesProvider>
        </AuthGate>
      ) : (
        <SitesProvider api={false}>
          <RouterProvider router={router} />
        </SitesProvider>
      )}
    </ToastProvider>
  </StrictMode>,
);
