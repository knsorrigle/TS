import { useRef } from 'react'
import { fetchTeam, type TeamMember } from '../lib/api'
import { useAsync } from '../lib/useAsync'
import { useReveals } from '../lib/reveal'

/** Redis team row: round avatars; on hover the photo swaps to the fun one. Renders nothing until real members exist. */
export function Team() {
  const root = useRef<HTMLElement>(null)
  const team = useAsync('team', fetchTeam)
  useReveals(root, [team.status])
  if (team.status !== 'success' || team.data.length === 0) return null
  return (
    <section ref={root} id="team" aria-labelledby="team-title" data-spark="0.42 0.05 0.6 2.2" className="relative bg-void px-[var(--gutter)] py-[var(--section-pad)]">
      <div className="mx-auto max-w-[1440px] text-center">
        <h2 id="team-title" className="t-h1 above-spark text-[clamp(64px,10vw,170px)]" data-reveal="lines">The people</h2>
        <p className="t-body mx-auto mt-4 max-w-[44ch]" data-reveal="up">Students who plan, build and host every TECHSPARK session.</p>
        <ul className="no-scrollbar -mx-[var(--gutter)] mt-16 flex snap-x gap-[clamp(16px,2.4vw,36px)] overflow-x-auto px-[var(--gutter)] pb-4 md:flex-wrap md:justify-center md:overflow-visible">
          {team.data.map((m) => <Member key={m.id} m={m} />)}
        </ul>
      </div>
    </section>
  )
}

function Member({ m }: { m: TeamMember }) {
  const initials = m.name.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase()
  return (
    <li className="group above-spark flex w-[clamp(120px,12vw,168px)] shrink-0 snap-start flex-col items-center" data-reveal="up" tabIndex={0}>
      <div className="relative aspect-square w-full overflow-hidden rounded-full border border-white/15 bg-[#0b0b0b] transition-[border-color,box-shadow] duration-700 group-hover:border-white/60 group-focus-visible:border-white/60">
        {m.photo ? (
          <>
            <img src={m.photo} alt={m.name} loading="lazy" className="absolute inset-0 h-full w-full object-cover grayscale transition-opacity duration-500 group-hover:opacity-0 group-focus-visible:opacity-0" />
            <img src={m.photoFun || m.photo} alt="" aria-hidden loading="lazy" className="absolute inset-0 h-full w-full scale-105 object-cover opacity-0 transition-[opacity,transform] duration-700 ease-[var(--ease-expo)] group-hover:scale-100 group-hover:opacity-100 group-focus-visible:opacity-100" />
          </>
        ) : (
          <span className="t-serif absolute inset-0 grid place-items-center text-[clamp(34px,3.4vw,48px)] text-white/90">{initials}</span>
        )}
      </div>
      <p className="mt-4 text-[15px] font-[560] text-white">{m.name}</p>
      <p className="text-[13px] text-mute-hi opacity-70 transition-opacity group-hover:opacity-100">{m.role}</p>
    </li>
  )
}
