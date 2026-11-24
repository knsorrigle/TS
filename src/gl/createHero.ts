import { Renderer, Program, Mesh, Triangle } from 'ogl'
import { gsap } from '../lib/motion'
import { heroFragment, heroVertex } from './heroShader'

export interface HeroGL {
  setPointer(x: number, y: number): void
  setScroll(v: number): void
  setVisible(v: boolean): void
  ignite(opts: { skip: boolean; reduced: boolean; onDone?: () => void }): void
  destroy(): void
}

/** Throws if WebGL isn't available, so the caller can show the static fallback. */
export function createHero(canvas: HTMLCanvasElement, opts: { reduced: boolean }): HeroGL {
  const renderer = new Renderer({
    canvas,
    dpr: Math.min(window.devicePixelRatio || 1, 1.5),
    alpha: false,
    depth: false,
    antialias: false,
    powerPreference: 'high-performance',
  })
  const gl = renderer.gl
  if (!gl) throw new Error('WebGL unavailable')
  gl.clearColor(0, 0, 0, 1)

  const uniforms = {
    uRes: { value: [1, 1] },
    uTime: { value: 0 },
    uPointer: { value: [0, 0] },
    uScroll: { value: 0 },
    uOrient: { value: 0 },
    uIgnite: { value: 0 },
    uFade: { value: 1 },
  }
  const program = new Program(gl, { vertex: heroVertex, fragment: heroFragment, uniforms, depthTest: false })
  const mesh = new Mesh(gl, { geometry: new Triangle(gl), program })

  // pointer is eased on the GPU side of things: we lerp toward target each frame (heavy, weighty drift)
  const target = { x: 0, y: 0 }
  const eased = { x: 0, y: 0 }
  let visible = true
  let dirty = true
  let t0 = performance.now()

  const resize = () => {
    // measure the parent: ogl writes inline px sizes onto the canvas itself
    const box = canvas.parentElement ?? canvas
    const w = box.clientWidth || window.innerWidth
    const h = box.clientHeight || window.innerHeight
    renderer.setSize(w, h)
    uniforms.uRes.value = [gl.drawingBufferWidth, gl.drawingBufferHeight]
    uniforms.uOrient.value = h > w * 1.05 ? 1 : 0
    dirty = true
  }
  const ro = new ResizeObserver(resize)
  ro.observe(canvas.parentElement ?? canvas)
  resize()

  const frame = () => {
    if (!visible) return
    const t = (performance.now() - t0) / 1000
    if (!opts.reduced) {
      uniforms.uTime.value = t
      eased.x += (target.x - eased.x) * 0.045
      eased.y += (target.y - eased.y) * 0.045
      uniforms.uPointer.value = [eased.x, eased.y]
    } else if (!dirty) return // reduced motion: only redraw when something actually changed
    renderer.render({ scene: mesh })
    dirty = false
  }
  gsap.ticker.add(frame)

  return {
    setPointer(x, y) { target.x = x; target.y = y },
    setScroll(v) { uniforms.uScroll.value = v; dirty = true },
    setVisible(v) {
      if (v && !visible) t0 = performance.now() - uniforms.uTime.value * 1000
      visible = v
      dirty = true
    },
    ignite({ skip, reduced, onDone }) {
      if (skip || reduced) {
        uniforms.uIgnite.value = 1
        uniforms.uFade.value = 0
        gsap.to(uniforms.uFade, { value: 1, duration: reduced ? 0.2 : 0.5, ease: 'power2.out', onUpdate: () => { dirty = true }, onComplete: onDone })
        return
      }
      uniforms.uIgnite.value = 0
      gsap.to(uniforms.uIgnite, { value: 1, duration: 1.65, ease: 'power2.inOut', onUpdate: () => { dirty = true }, onComplete: onDone })
    },
    destroy() {
      gsap.ticker.remove(frame)
      gsap.killTweensOf([uniforms.uIgnite, uniforms.uFade])
      ro.disconnect()
      // Free GPU objects but keep the context alive: the same <canvas> may be re-used on remount
      // (StrictMode / HMR), and a lost context there would fail to link the next program.
      program.remove()
      mesh.geometry.remove()
    },
  }
}
