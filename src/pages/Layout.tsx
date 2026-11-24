import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router'
import { Nav } from '../components/Nav'
import { Cursor } from '../components/Cursor'
import { Grain } from '../components/Grain'
import { ScrollProgress } from '../components/ScrollProgress'
import { Toaster } from '../components/Toaster'
import { RegisterModal } from '../components/RegisterModal'
import { ScrollTrigger, scrollToTarget, startSmoothScroll, stopSmoothScroll } from '../lib/motion'
import { markIntroDone } from '../lib/intro'

export function Layout() {
  const { pathname, hash } = useLocation()

  useEffect(() => {
    startSmoothScroll()
    return () => stopSmoothScroll()
  }, [])

  // only the home hero runs the ignition; every other route reveals the chrome immediately
  useEffect(() => { if (pathname !== '/') markIntroDone() }, [pathname])

  // route change: top of page, or the requested section
  useEffect(() => {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual'
    const id = hash.replace('#', '')
    requestAnimationFrame(() => {
      ScrollTrigger.refresh()
      if (id) scrollToTarget(id, { immediate: true })
      else window.scrollTo(0, 0)
    })
  }, [pathname, hash])

  return (
    <>
      <Nav />
      <ScrollProgress />
      <main id="main" tabIndex={-1} className="outline-none">
        <Outlet />
      </main>
      <RegisterModal />
      <Toaster />
      <Grain />
      <Cursor />
    </>
  )
}
