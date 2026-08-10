import { useCallback, useEffect, useRef, useState } from 'react'

const TICK_MS = 250

export interface TimerValue {
  readonly elapsedMs: number
  readonly reset: (elapsedMs?: number) => void
}

/**
 * Accumulates elapsed time from wall-clock deltas rather than counting ticks, so a
 * throttled background tab resumes with the right total instead of losing seconds.
 */
export function useTimer(running: boolean, initialMs = 0): TimerValue {
  const [elapsedMs, setElapsedMs] = useState(initialMs)
  const accumulatedRef = useRef(initialMs)
  const startedAtRef = useRef<number | null>(null)

  useEffect(() => {
    if (!running) return

    startedAtRef.current = Date.now()
    const id = setInterval(() => {
      const since = Date.now() - (startedAtRef.current as number)
      setElapsedMs(accumulatedRef.current + since)
    }, TICK_MS)

    return () => {
      clearInterval(id)
      if (startedAtRef.current !== null) {
        accumulatedRef.current += Date.now() - startedAtRef.current
        startedAtRef.current = null
        setElapsedMs(accumulatedRef.current)
      }
    }
  }, [running])

  const reset = useCallback((next = 0) => {
    accumulatedRef.current = next
    startedAtRef.current = Date.now()
    setElapsedMs(next)
  }, [])

  return { elapsedMs, reset }
}

export function formatDuration(totalMs: number): string {
  const totalSeconds = Math.floor(totalMs / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}
