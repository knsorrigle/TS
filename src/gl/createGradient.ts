import { Renderer, Program, Mesh, Triangle } from 'ogl'
import { gsap } from '../lib/motion'
import { gradFragment, gradVertex } from './gradientShader'

export interface GradientGL {
  setActive(v: number, immediate?: boolean): void
  setVisible(v: boolean): void
  destroy(): void
}

export function createGradient(canvas: HTMLCanvasElement, opts: { mode: number; pillar: boolean; reduced: boolean; active?: number }): GradientGL {
  const renderer = new Renderer({ canvas, dpr: Math.min(window.devicePixelRatio || 1, 1.5), alpha: false, depth: false, antialias: false })
  const gl = renderer.gl
  if (!gl) throw new Error('WebGL unavailable')
  const uniforms = {
    uRes: { value: [1, 1] }, uTime: { value: Math.random() * 40 }, uMode: { value: opts.mode },
    uActive: { value: opts.active ?? 1 }, uPillar: { value: opts.pillar ? 1 : 0 },
  }
  const program = new Program(gl, { vertex: gradVertex, fragment: gradFragment, uniforms, depthTest: false })
  const mesh = new Mesh(gl, { geometry: new Triangle(gl), program })
  let visible = false
  let dirty = true
  let last = performance.now()

  const resize = () => {
    const box = canvas.parentElement ?? canvas
    renderer.setSize(box.clientWidth || 1, box.clientHeight || 1)
    uniforms.uRes.value = [gl.drawingBufferWidth, gl.drawingBufferHeight]
    dirty = true
  }
  const ro = new ResizeObserver(resize)
  ro.observe(canvas.parentElement ?? canvas)
  resize()

  const frame = () => {
    if (!visible) return
    const now = performance.now()
    if (!opts.reduced) uniforms.uTime.value += Math.min(0.05, (now - last) / 1000)
    last = now
    if (opts.reduced && !dirty) return
    renderer.render({ scene: mesh })
    dirty = false
  }
  gsap.ticker.add(frame)

  return {
    setActive(v, immediate) {
      gsap.to(uniforms.uActive, { value: v, duration: immediate || opts.reduced ? 0 : 1.2, ease: 'power3.out', onUpdate: () => { dirty = true }, overwrite: true })
    },
    setVisible(v) { visible = v; last = performance.now(); dirty = true },
    destroy() {
      gsap.ticker.remove(frame)
      gsap.killTweensOf(uniforms.uActive)
      ro.disconnect()
      program.remove()
      mesh.geometry.remove()
    },
  }
}
