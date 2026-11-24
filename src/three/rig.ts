/**
 * Scroll rig. Sections declare a pose with data-spark="x y scale rot"
 * (x, y in viewport fractions from centre: -0.5..0.5; rot in turns).
 * We cache each anchor's page position and interpolate by the viewport centre.
 */
export interface Pose { x: number; y: number; s: number; r: number }
interface Anchor { at: number; pose: Pose }

let anchors: Anchor[] = []

export function measureAnchors() {
  const els = [...document.querySelectorAll<HTMLElement>('[data-spark]')]
  anchors = els
    .map((el) => {
      const [x = 0, y = 0, s = 1, r = 0] = (el.dataset.spark ?? '').split(/\s+/).map(Number)
      const rect = el.getBoundingClientRect()
      return { at: rect.top + scrollY + rect.height / 2, pose: { x, y, s, r } }
    })
    .sort((a, b) => a.at - b.at)
}

const ease = (t: number) => t * t * (3 - 2 * t)

export function poseAt(scroll: number, vh: number): Pose {
  if (!anchors.length) return { x: 0, y: 0, s: 1, r: 0 }
  const c = scroll + vh / 2
  if (c <= anchors[0].at) return anchors[0].pose
  const last = anchors[anchors.length - 1]
  if (c >= last.at) return last.pose
  let i = 0
  while (i < anchors.length - 1 && anchors[i + 1].at < c) i++
  const a = anchors[i], b = anchors[i + 1]
  const t = ease((c - a.at) / Math.max(1, b.at - a.at))
  return {
    x: a.pose.x + (b.pose.x - a.pose.x) * t,
    y: a.pose.y + (b.pose.y - a.pose.y) * t,
    s: a.pose.s + (b.pose.s - a.pose.s) * t,
    r: a.pose.r + (b.pose.r - a.pose.r) * t,
  }
}
