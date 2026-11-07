import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router';
import './styles/app.css';
import { StoreContext } from './data/hooks';
import { LocalStore } from './data/local-store';
import { ApiStore } from './data/api-store';
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

// VITE_DATA_SOURCE=api usa el API (apps/api + Neon); cualquier otro valor guarda en este navegador.
export const DATA_SOURCE = import.meta.env.VITE_DATA_SOURCE === 'api' ? 'api' : 'local';
const store = DATA_SOURCE === 'api' ? new ApiStore() : new LocalStore();

const router = createBrowserRouter([
  {
    path: '/',
    element: <Shell />,
    children: [
      { index: true, element: <Navigate to="/c/propiedad" replace /> },
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
    <StoreContext.Provider value={store}>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </StoreContext.Provider>
  </StrictMode>,
);
