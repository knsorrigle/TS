import { useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, Lightformer, MeshTransmissionMaterial } from '@react-three/drei'
import * as THREE from 'three'
import { spark, sparkTier } from './sparkState'
import { measureAnchors, poseAt } from './rig'
import { glowTexture } from './textures'
import { gsap, reducedMotion, ScrollTrigger, whenLenis } from '../lib/motion'
import { onIntroDone } from '../lib/intro'

/* pointer, tracked on window (the canvas never takes pointer events) */
const pointer = { x: 0, y: 0 }
if (typeof window !== 'undefined') {
  addEventListener('pointermove', (e) => {
    pointer.x = (e.clientX / innerWidth) * 2 - 1
    pointer.y = -((e.clientY / innerHeight) * 2 - 1)
  }, { passive: true })
}

const SPARK = new THREE.Color('#1A9FE8')
const CORE = new THREE.Color(1.4, 2.8, 4.6) // > 1 so it reads hot through tone mapping

function Crystal({ tier, reduced }: { tier: 'high' | 'mid' | 'low'; reduced: boolean }) {
  const group = useRef<THREE.Group>(null)
  const body = useRef<THREE.Mesh>(null)
  const core = useRef<THREE.Mesh>(null)
  const glow = useRef<THREE.Sprite>(null)
  const light = useRef<THREE.PointLight>(null)
  const { viewport, camera, size } = useThree()
  const glowTex = useMemo(() => glowTexture('#ffffff', '#5cc4ff', 256), [])
  const geo = useMemo(() => { const g = new THREE.OctahedronGeometry(1, 0); g.scale(0.82, 1.18, 0.82); return g }, [])
  const edges = useMemo(() => new THREE.EdgesGeometry(geo), [geo])
  const cur = useRef({ x: 0, y: 0, s: 1, r: 0, lx: 0, ly: 0, spin: 0 })

  useFrame((state, dt) => {
    const g = group.current
    if (!g) return
    const t = reduced ? 0 : state.clock.elapsedTime
    const vp = viewport.getCurrentViewport(camera, [0, 0, 0])
    const p = poseAt(scrollY, innerHeight)
    const c = cur.current
    const k = reduced ? 1 : 1 - Math.pow(0.0009, dt) // frame-rate independent heavy ease

    // lean toward a hovered card
    let lx = 0, ly = 0
    if (spark.lean) {
      lx = ((spark.lean.x / size.width) - 0.5 - p.x) * 0.22
      ly = (0.5 - (spark.lean.y / size.height) - p.y) * 0.22
    }
    c.lx += (lx - c.lx) * k * 0.8
    c.ly += (ly - c.ly) * k * 0.8
    c.x += (p.x - c.x) * k
    c.y += (p.y - c.y) * k
    c.s += (p.s - c.s) * k
    c.r += (p.r - c.r) * k

    // velocity spin, decaying
    spark.velocity *= 0.9
    c.spin += (Math.abs(spark.velocity) * 0.004 + (reduced ? 0 : 0.0035)) * (dt * 60)

    const intro = spark.intro
    const base = Math.min(vp.height * 0.1, vp.width * 0.13) * c.s * (0.0001 + intro)
    g.position.set((c.x + c.lx) * vp.width + pointer.x * 0.05 * vp.width * (reduced ? 0 : 1), (c.y + c.ly) * vp.height + Math.sin(t * 0.8) * 0.04 * vp.height * 0.1 + pointer.y * 0.02 * vp.height * (reduced ? 0 : 1), 0)
    g.scale.setScalar(base)
    g.rotation.set(
      0.18 + pointer.y * -0.25 + Math.sin(t * 0.37) * 0.05,
      reduced ? 0.62 : c.spin + c.r * Math.PI * 2 + (1 - intro) * 3, // reduced motion: one fixed, well-lit angle
      pointer.x * -0.2 + Math.cos(t * 0.29) * 0.04,
    )

    // core: pulse, flare, dim
    spark.flare = Math.max(0, spark.flare - dt * 0.9)
    const pulse = 0.85 + Math.sin(t * 2.1) * 0.12 + spark.flare * 2.2
    const dim = spark.dim ? 0.15 : 1
    if (core.current) core.current.scale.setScalar(0.3 * (1 + spark.flare * 0.35) * (0.4 + intro * 0.6))
    ;(core.current?.material as THREE.MeshBasicMaterial | undefined)?.color.copy(CORE).multiplyScalar(pulse * dim)
    if (glow.current) {
      glow.current.scale.setScalar((3.0 + spark.flare * 4) * (0.6 + Math.sin(t * 2.1) * 0.05))
      ;(glow.current.material as THREE.SpriteMaterial).opacity = (0.75 + spark.flare * 0.25) * dim * intro
    }
    if (light.current) light.current.intensity = (6 + spark.flare * 30) * dim * intro
  })

  return (
    <group ref={group}>
      <mesh ref={body} geometry={geo}>
        {tier !== 'low' ? (
          <MeshTransmissionMaterial
            samples={tier === 'high' ? 6 : 3} resolution={tier === 'high' ? 512 : 256} transmission={1} roughness={0.04} thickness={0.9} ior={1.62}
            chromaticAberration={tier === 'high' ? 0.4 : 0.22} anisotropicBlur={tier === 'high' ? 0.12 : 0.05} distortion={0.18} distortionScale={0.4} temporalDistortion={0.06}
            backside={tier === 'high'} backsideThickness={0.35} color="#eef6ff" attenuationColor="#5cc4ff" attenuationDistance={2.4} envMapIntensity={1.8}
          />
        ) : (
          // phones: no transmission pass — a dark, glossy blue glass that catches the studio light
          <meshPhysicalMaterial color="#5a9cff" roughness={0.03} metalness={0.05} clearcoat={1} clearcoatRoughness={0.03} transparent opacity={0.38} envMapIntensity={2.6} emissive="#1A9FE8" emissiveIntensity={0.25} />
        )}
      </mesh>
      <lineSegments geometry={edges}>
        <lineBasicMaterial color="#E8F1FF" transparent opacity={0.22} />
      </lineSegments>
      <mesh ref={core}>
        <octahedronGeometry args={[1, 0]} />
        <meshBasicMaterial color={CORE} toneMapped={false} />
      </mesh>
      <sprite ref={glow}>
        <spriteMaterial map={glowTex} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </sprite>
      <pointLight ref={light} color={SPARK} distance={8} decay={2} />
    </group>
  )
}

/* Light fragments: glass shards (mid/back) + soft orbs (front, blurred), parallaxing at three depths. */
function Fragments({ tier, reduced }: { tier: 'high' | 'mid' | 'low'; reduced: boolean }) {
  const { viewport, camera } = useThree()
  const shardGeo = useMemo(() => { const g = new THREE.OctahedronGeometry(1, 0); g.scale(0.7, 1.15, 0.7); return g }, [])
  const orbTex = useMemo(() => glowTexture('#bfe4ff', '#1A9FE8', 128), [])
  const items = useMemo(() => {
    const rnd = mulberry(7)
    const n = tier === 'high' ? 12 : tier === 'mid' ? 7 : 5
    return Array.from({ length: n }, (_, i) => {
      const layer = i % 3 // 0 back, 1 mid, 2 front
      return {
        layer,
        orb: false, // soft bokeh orbs read as stains on black; shards only
        x: (rnd() - 0.5) * 1.15,
        y: (rnd() - 0.5) * 2,
        z: layer === 0 ? -6 - rnd() * 4 : layer === 1 ? -1.5 - rnd() * 2 : 1 + rnd() * 1.5,
        s: layer === 0 ? 0.05 + rnd() * 0.05 : layer === 1 ? 0.08 + rnd() * 0.07 : 0.12 + rnd() * 0.08,
        speed: layer === 0 ? 0.25 : layer === 1 ? 0.6 : 1.35,
        rot: rnd() * Math.PI * 2, spin: (rnd() - 0.5) * 0.6, phase: rnd() * 10,
      }
    })
  }, [tier])
  const refs = useRef<(THREE.Object3D | null)[]>([])

  useFrame((state) => {
    const t = reduced ? 0 : state.clock.elapsedTime
    const intro = spark.intro
    items.forEach((it, i) => {
      const o = refs.current[i]
      if (!o) return
      const vp = viewport.getCurrentViewport(camera, [0, 0, it.z])
      const span = 2.0
      let yy = it.y + (scrollY / innerHeight) * it.speed * (reduced ? 0 : 1) + Math.sin(t * 0.3 + it.phase) * 0.02
      yy = ((((yy + span / 2) % span) + span) % span) - span / 2 // wrap
      const hx = it.x * vp.width, hy = yy * vp.height
      // assemble: shards start inside the crystal and fly out to their homes
      const e = 1 - Math.pow(1 - intro, 3)
      o.position.set(hx * e, hy * e, it.z)
      o.rotation.set(it.rot + t * it.spin, it.rot * 0.5 + t * it.spin * 0.7, 0)
      const sc = it.s * vp.height * 0.12 * (0.2 + 0.8 * e)
      o.scale.setScalar(it.orb ? sc * 3.2 : sc)
    })
  })

  return (
    <>
      {items.map((it, i) =>
        it.orb ? (
          <sprite key={i} ref={(r) => { refs.current[i] = r }}>
            <spriteMaterial map={orbTex} transparent depthWrite={false} blending={THREE.AdditiveBlending} opacity={it.layer === 2 ? 0.22 : 0.5} toneMapped={false} />
          </sprite>
        ) : (
          <mesh key={i} ref={(r) => { refs.current[i] = r }} geometry={shardGeo}>
            <meshPhysicalMaterial color="#a8d6ff" roughness={0.12} metalness={0.05} clearcoat={1} transparent opacity={it.layer === 0 ? 0.5 : 0.72} envMapIntensity={1.6} emissive={SPARK} emissiveIntensity={0.12} />
          </mesh>
        ),
      )}
    </>
  )
}

function mulberry(a: number) {
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
}

/** Studio light, built locally (no HDR download): a few soft panels for the glass to catch. */
function Studio() {
  return (
    <Environment resolution={256} frames={1}>
      <Lightformer form="rect" intensity={2.2} color="#ffffff" position={[0, 4, -6]} scale={[10, 2, 1]} />
      <Lightformer form="rect" intensity={3} color="#1A9FE8" position={[-5, 0, -3]} rotation-y={Math.PI / 3} scale={[2, 8, 1]} />
      <Lightformer form="rect" intensity={2} color="#7B86E8" position={[5, -1, -2]} rotation-y={-Math.PI / 3} scale={[2, 6, 1]} />
      <Lightformer form="ring" intensity={1.5} color="#E8F1FF" position={[0, -4, 3]} scale={3} />
    </Environment>
  )
}

/** Keeps anchors measured and feeds Lenis velocity into the spark. */
function Rig() {
  useEffect(() => {
    measureAnchors()
    const re = () => measureAnchors()
    ScrollTrigger.addEventListener('refresh', re)
    addEventListener('resize', re)
    const mo = new MutationObserver(() => requestAnimationFrame(re))
    mo.observe(document.getElementById('main') ?? document.body, { childList: true, subtree: true })
    const off = whenLenis((l) => l.on('scroll', (x) => { spark.velocity = x.velocity }))
    const iv = setInterval(re, 2000) // late images/fonts shifting layout
    return () => { ScrollTrigger.removeEventListener('refresh', re); removeEventListener('resize', re); mo.disconnect(); off(); clearInterval(iv) }
  }, [])
  return null
}

export default function SparkStage() {
  const tier = useMemo(sparkTier, [])
  const reduced = useMemo(reducedMotion, [])

  // the crystal assembles once the aperture has opened (or immediately on repeat/reduced)
  // if the poster is already showing (we arrived late), appear in place and crossfade instead of re-assembling
  const late = useMemo(() => document.documentElement.classList.contains('spark-intro'), [])
  useEffect(() => onIntroDone(() => {
    if (reduced || late) { spark.intro = 1; return }
    gsap.to(spark, { intro: 1, duration: 1.6, ease: 'expo.out', delay: 0.1, onComplete: () => { spark.flare = 0.6 } })
  }), [reduced, late])
  useEffect(() => () => document.documentElement.classList.remove('spark-ready'), [])

  return (
    <Canvas
      aria-hidden
      className="spark-stage"
      style={{ position: 'fixed', inset: 0, zIndex: 30, pointerEvents: 'none' }}
      dpr={[1, tier === 'high' ? 1.5 : 1.25]}
      gl={{ alpha: true, antialias: tier === 'high', powerPreference: 'high-performance' }}
      camera={{ fov: 32, position: [0, 0, 10], near: 0.1, far: 40 }}
      eventSource={undefined}
      onCreated={() => requestAnimationFrame(() => requestAnimationFrame(() => document.documentElement.classList.add('spark-ready')))}
    >
      <Studio />
      <ambientLight intensity={0.25} />
      <Crystal tier={tier} reduced={reduced} />
      <Fragments tier={tier} reduced={reduced} />
      <Rig />
    </Canvas>
  )
}
