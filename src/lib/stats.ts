import type { Difficulty } from './types'

/** Games are kept only for the most recent window; stats describe that window. */
export const MAX_HISTORY = 50

export type GameOutcome = 'completed' | 'abandoned'

export interface GameRecord {
  readonly difficulty: Difficulty
  readonly durationMs: number
  /** True when at least one hint was used. */
  readonly assisted: boolean
  readonly outcome: GameOutcome
  readonly finishedAt: number
}

export interface DifficultyStats {
  readonly completed: number
  /** Assisted games are excluded from both timings, so they stay comparable. */
  readonly bestTimeMs: number | null
  readonly averageTimeMs: number | null
  readonly currentStreak: number
  readonly longestStreak: number
}

export function emptyStats(): DifficultyStats {
  return {
    completed: 0,
    bestTimeMs: null,
    averageTimeMs: null,
    currentStreak: 0,
    longestStreak: 0,
  }
}

/** History is oldest-first; the oldest records fall off once the window is full. */
export function appendRecord(
  history: readonly GameRecord[],
  record: GameRecord,
): GameRecord[] {
  return [...history, record].slice(-MAX_HISTORY)
}

export function statsFor(
  history: readonly GameRecord[],
  difficulty: Difficulty,
): DifficultyStats {
  const relevant = history.filter((record) => record.difficulty === difficulty)
  if (relevant.length === 0) return emptyStats()

  const completed = relevant.filter((record) => record.outcome === 'completed')
  const timed = completed.filter((record) => !record.assisted)

  let bestTimeMs: number | null = null
  let totalMs = 0
  for (const record of timed) {
    totalMs += record.durationMs
    if (bestTimeMs === null || record.durationMs < bestTimeMs) bestTimeMs = record.durationMs
  }

  let currentStreak = 0
  let longestStreak = 0
  let running = 0
  for (const record of relevant) {
    if (record.outcome === 'completed') {
      running++
      if (running > longestStreak) longestStreak = running
    } else {
      running = 0
    }
  }
  currentStreak = running

  return {
    completed: completed.length,
    bestTimeMs,
    averageTimeMs: timed.length > 0 ? Math.round(totalMs / timed.length) : null,
    currentStreak,
    longestStreak,
  }
}
