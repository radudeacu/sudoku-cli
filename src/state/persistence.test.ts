import { describe, expect, it } from 'vitest'
import { bitFor, formatGrid, parseGrid } from '../lib/grid'
import type { Puzzle } from '../lib/types'
import { gameReducer, initialGameState, type GameState } from './gameReducer'
import { fromSavedGame, toSavedGame } from './persistence'

const GIVENS =
  '530070000600195000098000060800060003400803001700020006060000280000419005000080079'
const SOLUTION =
  '534678912672195348198342567859761423426853791713924856961537284287419635345286179'

function puzzle(): Puzzle {
  return {
    difficulty: 'hard',
    givens: parseGrid(GIVENS),
    solution: parseGrid(SOLUTION),
    clueCount: 30,
    hardestTechnique: 'pointingPair',
  }
}

function playing(): GameState {
  return gameReducer(initialGameState(), { type: 'loadPuzzle', puzzle: puzzle() })
}

describe('toSavedGame', () => {
  it('returns null before a puzzle exists', () => {
    expect(toSavedGame(initialGameState(), 'easy', 0)).toBeNull()
  })

  it('returns null once the game is over, since there is nothing to resume', () => {
    const done = gameReducer(playing(), { type: 'revealSolution' })
    expect(toSavedGame(done, 'hard', 1000)).toBeNull()
  })

  it('saves a paused game', () => {
    const paused = gameReducer(playing(), { type: 'pause' })
    expect(toSavedGame(paused, 'hard', 5000)?.paused).toBe(true)
  })
})

describe('round-tripping a game', () => {
  function midGame(): GameState {
    let state = gameReducer(playing(), { type: 'select', index: 2 })
    state = gameReducer(state, { type: 'setDigit', digit: 9, autoClearNotes: true })
    state = gameReducer(state, { type: 'check' })
    state = gameReducer(state, { type: 'select', index: 3 })
    state = gameReducer(state, { type: 'setDigit', digit: 7, autoClearNotes: true, asNote: true })
    return gameReducer(state, { type: 'hint' })
  }

  it('preserves the board, notes, and counters', () => {
    const before = midGame()
    const saved = toSavedGame(before, 'hard', 42_000)
    expect(saved).not.toBeNull()

    const after = fromSavedGame(saved as NonNullable<typeof saved>)

    expect(formatGrid(after.state.values)).toBe(formatGrid(before.values))
    expect(Array.from(after.state.notes)).toEqual(Array.from(before.notes))
    expect(after.state.mistakes).toBe(before.mistakes)
    expect(after.state.hintsUsed).toBe(before.hintsUsed)
    expect(after.state.selected).toBe(before.selected)
    expect(after.state.notesMode).toBe(before.notesMode)
    expect(after.difficulty).toBe('hard')
    expect(after.elapsedMs).toBe(42_000)
  })

  it('preserves the puzzle itself', () => {
    const saved = toSavedGame(midGame(), 'hard', 0)
    const after = fromSavedGame(saved as NonNullable<typeof saved>)

    // The fixture writes empties as '0'; formatGrid writes '.', so normalise both.
    expect(formatGrid(after.state.puzzle?.givens as Uint8Array)).toBe(
      formatGrid(parseGrid(GIVENS)),
    )
    expect(formatGrid(after.state.puzzle?.solution as Uint8Array)).toBe(SOLUTION)
    expect(after.state.puzzle?.hardestTechnique).toBe('pointingPair')
    expect(after.state.puzzle?.clueCount).toBe(30)
  })

  it('keeps a note mask intact', () => {
    let state = gameReducer(playing(), { type: 'select', index: 2 })
    state = gameReducer(state, { type: 'toggleNotesMode' })
    state = gameReducer(state, { type: 'setDigit', digit: 4, autoClearNotes: false })
    state = gameReducer(state, { type: 'setDigit', digit: 8, autoClearNotes: false })

    const saved = toSavedGame(state, 'hard', 0)
    const after = fromSavedGame(saved as NonNullable<typeof saved>)

    expect(after.state.notes[2]).toBe(bitFor(4) | bitFor(8))
  })

  it('starts the restored game with no undo history', () => {
    const saved = toSavedGame(midGame(), 'hard', 0)
    const after = fromSavedGame(saved as NonNullable<typeof saved>)

    expect(after.state.past).toHaveLength(0)
    expect(after.state.future).toHaveLength(0)
  })
})
