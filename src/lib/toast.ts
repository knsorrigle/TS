import { useSyncExternalStore } from 'react'

export interface Toast { id: number; kind: 'success' | 'error' | 'info'; message: string }
let toasts: Toast[] = []
let seq = 0
const subs = new Set<() => void>()
const emit = () => subs.forEach((f) => f())

function push(kind: Toast['kind'], message: string, ms = 3600) {
  const id = ++seq
  toasts = [...toasts.slice(-2), { id, kind, message }]
  emit()
  setTimeout(() => dismiss(id), ms)
}
export function dismiss(id: number) { toasts = toasts.filter((t) => t.id !== id); emit() }
export const toast = {
  success: (m: string) => push('success', m),
  error: (m: string) => push('error', m, 5200),
  info: (m: string) => push('info', m),
}
export const useToasts = () =>
  useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f) }, () => toasts, () => toasts)
