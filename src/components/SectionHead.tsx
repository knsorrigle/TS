import type { ReactNode } from 'react'

/** Editorial label rail:  02 │ About ─────────── Student-led initiative */
export function SectionHead({ index, label, aside }: { index: string; label: string; aside?: ReactNode }) {
  return (
    <div className="flex items-center gap-4 border-b border-line pb-4" data-reveal="up">
      <span className="t-num text-[12px] font-[650] text-spark">{index}</span>
      <span className="h-3 w-px bg-line-strong" aria-hidden />
      <span className="t-label">{label}</span>
      {aside && <span className="t-meta ml-auto hidden text-right sm:block">{aside}</span>}
    </div>
  )
}
