import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router'
import './styles/index.css'
import { Layout } from './pages/Layout'
import { Home } from './pages/Home'
import { EventDetail } from './pages/EventDetail'
import { NotFound } from './pages/NotFound'

const AdminApp = lazy(() => import('./admin/AdminApp'))

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { index: true, element: <Home /> },
      { path: 'events/:slug', element: <EventDetail /> },
      { path: 'admin', element: <Suspense fallback={<div className="min-h-[100svh] bg-void" />}><AdminApp /></Suspense> },
      { path: '*', element: <NotFound /> },
    ],
  },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
