import { useEffect, useState } from 'react'
import { getLocalReg, onLocalRegChange, watchLocalRegs, type LocalReg } from './registrations'

export function useLocalReg(eventId: string | undefined): LocalReg | null {
  const [reg, setReg] = useState(() => (eventId ? getLocalReg(eventId) : null))
  useEffect(() => {
    if (!eventId) return
    setReg(getLocalReg(eventId))
    watchLocalRegs()
    return onLocalRegChange(() => setReg(getLocalReg(eventId)))
  }, [eventId])
  return reg
}
