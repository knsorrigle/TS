import { Hero } from '../sections/Hero'
import { Intro } from '../sections/Intro'
import { Statement } from '../sections/Statement'
import { Events } from '../sections/Events'
import { WhatWeDo } from '../sections/WhatWeDo'
import { Bulletins } from '../sections/Bulletins'
import { Archive } from '../sections/Archive'
import { Team } from '../sections/Team'
import { ClosingCta } from '../sections/ClosingCta'
import { Footer } from '../sections/Footer'

export function Home() {
  return (
    <>
      <Hero />
      <Intro />
      <Statement />
      <Events />
      <WhatWeDo />
      <Bulletins />
      <Archive />
      <Team />
      <ClosingCta />
      <Footer loop />
    </>
  )
}
