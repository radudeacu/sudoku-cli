import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { GameRecord } from './stats'
import {
  SCHEMA_VERSION,
  clearGame,
  loadGame,
  loadHistory,
  loadPlayerName,
  saveGame,
  saveHistory,
  savePlayerName,
  type SavedGame,
} from './storage'

/** Tests run in the node environment, so localStorage has to be supplied. */
class MemoryStorage {
  private store = new Map<string, string>()

  get length(): number {
    return this.store.size
  }

  key(index: number): string | null {
    return [...this.store.keys()][index] ?? null
  }

  getItem(key: string): string | null {
    return this.store.get(key) ?? null
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value))
  }

  removeItem(key: string): void {
    this.store.delete(key)
  }

  clear(): void {
    this.store.clear()
  }
}

const GIVENS = `53..7....6..195....98....6.8...6...34..8.3..17...2...6.6....28....419..5....8..79`
const SOLUTION = `534678912672195348198342567859761423426853791713924856961537284287419635345286179`

function makeSaved(overrides: Partial<SavedGame> = {}): SavedGame {
  return {
    version: SCHEMA_VERSION,
    difficulty: 'medium',
    givens: GIVENS,
    solution: SOLUTION,
    values: GIVENS,
    notes: new Array<number>(81).fill(0),
    clueCount: 30,
    hardestTechnique: 'hiddenSingle',
    selected: 4,
    notesMode: false,
    mistakes: 2,
    hintsUsed: 1,
    elapsedMs: 61_000,
    paused: false,
    ...overrides,
  }
}

beforeEach(() => {
  vi.stubGlobal('localStorage', new MemoryStorage())
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('saved games', () => {
  it('round-trips a game', () => {
    const saved = makeSaved()
    saveGame(saved)
    expect(loadGame()).toEqual(saved)
  })

  it('returns null when nothing is stored', () => {
    expect(loadGame()).toBeNull()
  })

  it('discards a save from an older schema', () => {
    saveGame(makeSaved({ version: SCHEMA_VERSION - 1 }))
    expect(loadGame()).toBeNull()
  })

  it('discards unparseable JSON instead of throwing', () => {
    localStorage.setItem('sudoku.game', '{ not json')
    expect(() => loadGame()).not.toThrow()
    expect(loadGame()).toBeNull()
  })

  it.each([
    ['a short grid', { values: '123' }],
    ['a grid with bad characters', { values: 'x'.repeat(81) }],
    ['the wrong number of note cells', { notes: [1, 2, 3] }],
    ['an out-of-range note mask', { notes: new Array<number>(81).fill(1024) }],
    ['an unknown difficulty', { difficulty: 'impossible' }],
    ['an unknown technique', { hardestTechnique: 'telepathy' }],
    ['a selection outside the grid', { selected: 81 }],
    ['a negative timer', { elapsedMs: -1 }],
    ['a non-boolean pause flag', { paused: 'yes' }],
  ])('discards a save with %s', (_label, override) => {
    localStorage.setItem('sudoku.game', JSON.stringify({ ...makeSaved(), ...override }))
    expect(loadGame()).toBeNull()
  })

  it('accepts a null selection', () => {
    saveGame(makeSaved({ selected: null }))
    expect(loadGame()?.selected).toBeNull()
  })

  it('clears the stored game', () => {
    saveGame(makeSaved())
    clearGame()
    expect(loadGame()).toBeNull()
  })

  it('survives localStorage being unavailable', () => {
    vi.stubGlobal('localStorage', undefined)
    expect(() => saveGame(makeSaved())).not.toThrow()
    expect(loadGame()).toBeNull()
  })
})

describe('history', () => {
  const record: GameRecord = {
    difficulty: 'hard',
    durationMs: 300_000,
    assisted: false,
    outcome: 'completed',
    finishedAt: 1_700_000_000_000,
  }

  it('round-trips records', () => {
    saveHistory([record])
    expect(loadHistory()).toEqual([record])
  })

  it('returns an empty list when nothing is stored', () => {
    expect(loadHistory()).toEqual([])
  })

  it('drops only the malformed entries', () => {
    localStorage.setItem(
      'sudoku.history',
      JSON.stringify([record, { difficulty: 'nope' }, null, record]),
    )
    expect(loadHistory()).toEqual([record, record])
  })

  it('returns an empty list when the stored value is not an array', () => {
    localStorage.setItem('sudoku.history', JSON.stringify({ difficulty: 'hard' }))
    expect(loadHistory()).toEqual([])
  })
})

describe('player name', () => {
  it('round-trips a name', () => {
    savePlayerName('Radu')
    expect(loadPlayerName()).toBe('Radu')
  })

  it('treats blank and missing names as unset', () => {
    expect(loadPlayerName()).toBeNull()
    savePlayerName('   ')
    expect(loadPlayerName()).toBeNull()
  })
})
