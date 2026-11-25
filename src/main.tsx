import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router'
import './styles/index.css'
import { Layout } from './pages/Layout'
import { Home } from './pages/Home'
import { EventDetail } from './pages/EventDetail'
import { NotFound } from './pages/NotFound'
import { RouteError } from './pages/RouteError'

const AdminApp = lazy(() => import('./admin/AdminApp'))

const router = createBrowserRouter([
  {
    element: <Layout />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <Home />, errorElement: <RouteError /> },
      { path: 'events/:slug', element: <EventDetail />, errorElement: <RouteError /> },
      { path: 'admin', element: <Suspense fallback={<div className="min-h-[100svh] bg-void" />}><AdminApp /></Suspense>, errorElement: <RouteError /> },
      { path: '*', element: <NotFound /> },
    ],
  },
])

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
