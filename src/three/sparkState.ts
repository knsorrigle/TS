/**
 * Mutable, render-loop-friendly state shared between the DOM and the 3D scene.
 * No React re-renders: the DOM writes, useFrame reads.
 */
export const spark = {
  /** 0 → 1 as the crystal assembles after ignition */
  intro: 0,
  /** set by DOM: 0..1 flare impulse, decays in the render loop */
  flare: 0,
  /** dims the core (404 page) */
  dim: false,
  /** screen-space point the crystal should lean toward (px), or null */
  lean: null as null | { x: number; y: number },
  /** smoothed scroll velocity from Lenis (px/frame) */
  velocity: 0,
}

export const flareSpark = (amount = 1) => { spark.flare = Math.max(spark.flare, amount) }
export const leanSpark = (p: { x: number; y: number } | null) => { spark.lean = p }

/** Device tier: high = desktop glass, mid = phones (real glass, fewer samples), low = weak GPUs. */
export function sparkTier(): 'high' | 'mid' | 'low' {
  const nav = navigator as Navigator & { deviceMemory?: number }
  const small = matchMedia('(max-width: 767px)').matches
  const weak = (nav.hardwareConcurrency ?? 8) <= 4 || (nav.deviceMemory ?? 8) <= 3
  if (weak) return 'low'
  return small ? 'mid' : 'high'
}
