import { useCallback, useEffect, useRef, useState } from 'react'
import { DATA_UPDATED_EVENT } from './supabase'

export type AsyncState<T> =
  | { status: 'loading'; data: null; error: null }
  | { status: 'success'; data: T; error: null }
  | { status: 'error'; data: null; error: string }

const cache = new Map<string, { at: number; promise: Promise<unknown> }>()
const TTL = 30_000

/** Shared, de-duplicated fetch. Refetches when admin writes dispatch `techspark_data_updated`. */
export function useAsync<T>(key: string, fn: () => Promise<T>): AsyncState<T> & { reload: () => void } {
  const [state, setState] = useState<AsyncState<T>>({ status: 'loading', data: null, error: null })
  const fnRef = useRef(fn)
  fnRef.current = fn

  const run = useCallback((force = false) => {
    let hit = cache.get(key)
    if (force || !hit || Date.now() - hit.at > TTL) {
      hit = { at: Date.now(), promise: fnRef.current() }
      cache.set(key, hit)
      hit.promise.catch(() => cache.delete(key))
    }
    let alive = true
    ;(hit.promise as Promise<T>)
      .then((data) => alive && setState({ status: 'success', data, error: null }))
      .catch((e: unknown) => alive && setState({ status: 'error', data: null, error: e instanceof Error ? e.message : String(e) }))
    return () => { alive = false }
  }, [key])

  useEffect(() => run(), [run])
  useEffect(() => {
    const on = () => run(true)
    window.addEventListener(DATA_UPDATED_EVENT, on)
    return () => window.removeEventListener(DATA_UPDATED_EVENT, on)
  }, [run])

  const reload = useCallback(() => {
    setState({ status: 'loading', data: null, error: null })
    run(true)
  }, [run])

  return { ...state, reload }
}
