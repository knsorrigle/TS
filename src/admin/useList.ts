import { useCallback, useEffect, useState } from 'react'

export function useList<T>(fn: () => Promise<T[]>) {
  const [state, setState] = useState<{ status: 'loading' | 'success' | 'error'; data: T[]; error: string | null }>({ status: 'loading', data: [], error: null })
  const load = useCallback(async () => {
    setState((s) => ({ ...s, status: s.data.length ? 'success' : 'loading', error: null }))
    try { setState({ status: 'success', data: await fn(), error: null }) }
    catch (e) { setState({ status: 'error', data: [], error: e instanceof Error ? e.message : String(e) }) }
  }, [fn])
  useEffect(() => { load() }, [load])
  return { ...state, reload: load }
}
