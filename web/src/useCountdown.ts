import { useEffect, useState } from 'react'

export function useCountdown(targetIso: string | null) {
  const [remainingMs, setRemainingMs] = useState(() => (targetIso ? new Date(targetIso).getTime() - Date.now() : 0))

  useEffect(() => {
    if (!targetIso) return
    const tick = () => setRemainingMs(new Date(targetIso).getTime() - Date.now())
    tick()
    const int = setInterval(tick, 1000)
    return () => clearInterval(int)
  }, [targetIso])

  const clamped = Math.max(0, remainingMs)
  const mm = Math.floor(clamped / 60000)
  const ss = Math.floor((clamped % 60000) / 1000)
  const label = `${mm}:${String(ss).padStart(2, '0')}`
  return { remainingMs: clamped, label, isOver: remainingMs <= 0 }
}
