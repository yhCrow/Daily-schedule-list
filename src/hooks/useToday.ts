import { useEffect, useState } from 'react'
import { todayISO } from '../lib/dates'

/** Today's local date, updated automatically when the day rolls over. */
export function useToday(): string {
  const [today, setToday] = useState(todayISO)
  useEffect(() => {
    const tick = () => setToday(todayISO())
    const timer = setInterval(tick, 30_000)
    document.addEventListener('visibilitychange', tick)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [])
  return today
}
