import { useSyncExternalStore } from 'react'
import type { TSEvent } from './api'

/** One registration sheet for the whole app, opened from cards, the detail page, the hero or the mobile bar. */
let current: TSEvent | null = null
const subs = new Set<() => void>()
export const openRegister = (e: TSEvent) => { current = e; subs.forEach((f) => f()) }
export const closeRegister = () => { current = null; subs.forEach((f) => f()) }
export const useRegisterTarget = () =>
  useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f) }, () => current, () => current)
