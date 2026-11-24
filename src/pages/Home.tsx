import { Hero } from '../sections/Hero'
import { Intro } from '../sections/Intro'
import { About } from '../sections/About'
import { Categories } from '../sections/Categories'
import { Events } from '../sections/Events'
import { Bulletins } from '../sections/Bulletins'
import { Archive } from '../sections/Archive'
import { ClosingCta } from '../sections/ClosingCta'
import { Footer } from '../sections/Footer'
import { ScrollHud } from '../components/ScrollHud'
import { MobileRegisterBar } from '../components/MobileRegisterBar'

export function Home() {
  return (
    <>
      <Hero />
      <Intro />
      <About />
      <Categories />
      <Events />
      <Bulletins />
      <Archive />
      <ClosingCta />
      <Footer />
      <ScrollHud />
      <MobileRegisterBar />
    </>
  )
}
