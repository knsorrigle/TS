import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router'
import { Nav } from '../components/Nav'
import { Cursor } from '../components/Cursor'
import { Grain } from '../components/Grain'
import { ScrollProgress } from '../components/ScrollProgress'
import { ScrollTrigger, scrollToTarget, startSmoothScroll, stopSmoothScroll } from '../lib/motion'

export function Layout() {
  const { pathname, hash } = useLocation()

  useEffect(() => {
    startSmoothScroll()
    return () => stopSmoothScroll()
  }, [])

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
      <Grain />
      <Cursor />
    </>
  )
}
