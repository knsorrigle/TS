import { useLayoutEffect, type RefObject } from 'react'
import { SplitText } from 'gsap/SplitText'
import { gsap, reducedMotion } from './motion'

gsap.registerPlugin(SplitText)

/** Line-by-line masked reveal for every `[data-reveal="lines"]` inside root, plus soft rise for `[data-reveal="up"]`. */
export function useReveals(root: RefObject<HTMLElement | null>, deps: unknown[] = []) {
  useLayoutEffect(() => {
    const el = root.current
    if (!el) return
    if (reducedMotion()) {
      gsap.set(el.querySelectorAll('[data-reveal]'), { autoAlpha: 1 })
      return
    }
    const splits: SplitText[] = []
    const ctx = gsap.context(() => {
      el.querySelectorAll<HTMLElement>('[data-reveal="lines"]').forEach((node) => {
        gsap.set(node, { autoAlpha: 1 })
        const split = SplitText.create(node, {
          type: 'lines',
          mask: 'lines',
          linesClass: 'split-line',
          autoSplit: true,
          onSplit: (self) =>
            gsap.from(self.lines, {
              yPercent: 112,
              duration: 1.25,
              ease: 'expo.out',
              stagger: 0.085,
              delay: Number(node.dataset.delay ?? 0),
              scrollTrigger: { trigger: node, start: 'top 88%', once: true },
            }),
        })
        splits.push(split)
      })
      el.querySelectorAll<HTMLElement>('[data-reveal="up"]').forEach((node) => {
        gsap.fromTo(node, { autoAlpha: 0, y: 28 }, {
          autoAlpha: 1, y: 0, duration: 1.2, ease: 'expo.out', delay: Number(node.dataset.delay ?? 0),
          scrollTrigger: { trigger: node, start: 'top 90%', once: true },
        })
      })
    }, el)
    return () => { ctx.revert(); splits.forEach((s) => s.revert()) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}
