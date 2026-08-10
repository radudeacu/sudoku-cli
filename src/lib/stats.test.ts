import { describe, expect, it } from 'vitest'
import { MAX_HISTORY, appendRecord, emptyStats, statsFor, type GameRecord } from './stats'
import type { Difficulty } from './types'

function record(overrides: Partial<GameRecord> = {}): GameRecord {
  return {
    difficulty: 'easy',
    durationMs: 60_000,
    assisted: false,
    outcome: 'completed',
    finishedAt: 0,
    ...overrides,
  }
}

describe('appendRecord', () => {
  it('keeps history oldest-first', () => {
    const history = appendRecord(appendRecord([], record({ finishedAt: 1 })), record({ finishedAt: 2 }))
    expect(history.map((entry) => entry.finishedAt)).toEqual([1, 2])
  })

  it('drops the oldest entries past the window', () => {
    let history: GameRecord[] = []
    for (let index = 0; index < MAX_HISTORY + 10; index++) {
      history = appendRecord(history, record({ finishedAt: index }))
    }
    expect(history).toHaveLength(MAX_HISTORY)
    expect(history[0]?.finishedAt).toBe(10)
  })
})

describe('statsFor', () => {
  it('returns empty stats when nothing matches the difficulty', () => {
    expect(statsFor([record({ difficulty: 'hard' })], 'easy')).toEqual(emptyStats())
  })

  it('counts only completed games', () => {
    const history = [record(), record({ outcome: 'abandoned' }), record()]
    expect(statsFor(history, 'easy').completed).toBe(2)
  })

  it('excludes assisted games from best and average time', () => {
    const history = [
      record({ durationMs: 100_000 }),
      record({ durationMs: 200_000 }),
      record({ durationMs: 1_000, assisted: true }),
    ]
    const stats = statsFor(history, 'easy')

    expect(stats.bestTimeMs).toBe(100_000)
    expect(stats.averageTimeMs).toBe(150_000)
    expect(stats.completed).toBe(3)
  })

  it('has no timings when every completed game was assisted', () => {
    const stats = statsFor([record({ assisted: true })], 'easy')
    expect(stats.bestTimeMs).toBeNull()
    expect(stats.averageTimeMs).toBeNull()
    expect(stats.completed).toBe(1)
  })

  it('breaks the current streak on an abandoned game', () => {
    const history = [record(), record(), record({ outcome: 'abandoned' }), record()]
    const stats = statsFor(history, 'easy')

    expect(stats.currentStreak).toBe(1)
    expect(stats.longestStreak).toBe(2)
  })

  it('counts an unbroken run as both current and longest', () => {
    const stats = statsFor([record(), record(), record()], 'easy')
    expect(stats.currentStreak).toBe(3)
    expect(stats.longestStreak).toBe(3)
  })

  it('keeps difficulties independent', () => {
    const history: GameRecord[] = [
      record({ difficulty: 'easy', durationMs: 10_000 }),
      record({ difficulty: 'expert', durationMs: 900_000 }),
      record({ difficulty: 'expert', outcome: 'abandoned' }),
    ]

    expect(statsFor(history, 'easy').bestTimeMs).toBe(10_000)
    expect(statsFor(history, 'expert').bestTimeMs).toBe(900_000)
    expect(statsFor(history, 'expert').currentStreak).toBe(0)

    const untouched: Difficulty = 'medium'
    expect(statsFor(history, untouched)).toEqual(emptyStats())
  })
})
