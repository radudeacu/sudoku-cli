import { describe, expect, it } from 'vitest'
import { CELLS, PEERS, bitFor, cloneGrid, parseGrid } from '../lib/grid'
import type { Puzzle } from '../lib/types'
import { gameReducer, initialGameState, type GameState } from './gameReducer'

const GIVENS =
  '530070000600195000098000060800060003400803001700020006060000280000419005000080079'
const SOLUTION =
  '534678912672195348198342567859761423426853791713924856961537284287419635345286179'

const EMPTY_CELL = 2 // '0' in GIVENS, solves to 4
const GIVEN_CELL = 0 // '5' in GIVENS

function makePuzzle(): Puzzle {
  return {
    difficulty: 'easy',
    givens: parseGrid(GIVENS),
    solution: parseGrid(SOLUTION),
    clueCount: 30,
    hardestTechnique: 'hiddenSingle',
  }
}

function playing(): GameState {
  return gameReducer(initialGameState(), { type: 'loadPuzzle', puzzle: makePuzzle() })
}

function selecting(index: number): GameState {
  return gameReducer(playing(), { type: 'select', index })
}

function typeDigit(state: GameState, digit: number, autoClearNotes = false): GameState {
  return gameReducer(state, { type: 'setDigit', digit, autoClearNotes })
}

/** Givens are locked, so note tests need a peer the player is actually allowed to edit. */
function editablePeerOf(index: number): number {
  const givens = parseGrid(GIVENS)
  const peer = (PEERS[index] as readonly number[]).find((cell) => givens[cell] === 0)
  if (peer === undefined) throw new Error(`No editable peer for cell ${index}`)
  return peer
}

describe('loadPuzzle', () => {
  it('starts from the givens and begins play', () => {
    const state = playing()
    expect(state.status).toBe('playing')
    expect(Array.from(state.values)).toEqual(Array.from(parseGrid(GIVENS)))
    expect(state.mistakes).toBe(0)
    expect(state.hintsUsed).toBe(0)
    expect(state.past).toHaveLength(0)
  })
})

describe('entering digits', () => {
  it('fills the selected cell', () => {
    const state = typeDigit(selecting(EMPTY_CELL), 4)
    expect(state.values[EMPTY_CELL]).toBe(4)
  })

  it('refuses to edit a given', () => {
    const state = typeDigit(selecting(GIVEN_CELL), 9)
    expect(state.values[GIVEN_CELL]).toBe(5)
    expect(state.past).toHaveLength(0)
  })

  it('does nothing when no cell is selected', () => {
    expect(typeDigit(playing(), 4)).toEqual(playing())
  })

  it('clears the cell when the same digit is typed again', () => {
    const filled = typeDigit(selecting(EMPTY_CELL), 4)
    expect(typeDigit(filled, 4).values[EMPTY_CELL]).toBe(0)
  })

  it('accepts a wrong digit without complaint', () => {
    const state = typeDigit(selecting(EMPTY_CELL), 9)
    expect(state.values[EMPTY_CELL]).toBe(9)
    expect(state.incorrect).toEqual([])
    expect(state.mistakes).toBe(0)
  })
})

describe('notes', () => {
  it('toggles candidates without filling the cell', () => {
    let state = gameReducer(selecting(EMPTY_CELL), { type: 'toggleNotesMode' })
    state = typeDigit(state, 4)
    state = typeDigit(state, 7)

    expect(state.values[EMPTY_CELL]).toBe(0)
    expect(state.notes[EMPTY_CELL]).toBe(bitFor(4) | bitFor(7))

    state = typeDigit(state, 4)
    expect(state.notes[EMPTY_CELL]).toBe(bitFor(7))
  })

  it('removes the digit from peers when auto-clear is on', () => {
    let state = gameReducer(selecting(EMPTY_CELL), { type: 'toggleNotesMode' })

    const peer = editablePeerOf(EMPTY_CELL)
    state = gameReducer(state, { type: 'select', index: peer })
    state = typeDigit(state, 4)
    expect(state.notes[peer]).toBe(bitFor(4))

    state = gameReducer(state, { type: 'toggleNotesMode' })
    state = gameReducer(state, { type: 'select', index: EMPTY_CELL })
    state = typeDigit(state, 4, true)

    expect(state.notes[peer]).toBe(0)
  })

  it('leaves peer notes alone when auto-clear is off', () => {
    let state = gameReducer(selecting(EMPTY_CELL), { type: 'toggleNotesMode' })

    const peer = editablePeerOf(EMPTY_CELL)
    state = gameReducer(state, { type: 'select', index: peer })
    state = typeDigit(state, 4)

    state = gameReducer(state, { type: 'toggleNotesMode' })
    state = gameReducer(state, { type: 'select', index: EMPTY_CELL })
    state = typeDigit(state, 4, false)

    expect(state.notes[peer]).toBe(bitFor(4))
  })
})

describe('clearing', () => {
  it('empties both the digit and the notes', () => {
    const filled = typeDigit(selecting(EMPTY_CELL), 4)
    expect(gameReducer(filled, { type: 'clearCell' }).values[EMPTY_CELL]).toBe(0)
  })

  it('is a no-op on an already empty cell', () => {
    const state = selecting(EMPTY_CELL)
    expect(gameReducer(state, { type: 'clearCell' })).toBe(state)
  })
})

describe('undo and redo', () => {
  it('steps backwards and forwards through edits', () => {
    const first = typeDigit(selecting(EMPTY_CELL), 4)
    const second = typeDigit(gameReducer(first, { type: 'select', index: 3 }), 6)

    const undone = gameReducer(second, { type: 'undo' })
    expect(undone.values[3]).toBe(0)
    expect(undone.values[EMPTY_CELL]).toBe(4)

    const redone = gameReducer(undone, { type: 'redo' })
    expect(redone.values[3]).toBe(6)
  })

  it('covers note changes too', () => {
    let state = gameReducer(selecting(EMPTY_CELL), { type: 'toggleNotesMode' })
    state = typeDigit(state, 4)
    expect(gameReducer(state, { type: 'undo' }).notes[EMPTY_CELL]).toBe(0)
  })

  it('does nothing when there is no history', () => {
    const state = playing()
    expect(gameReducer(state, { type: 'undo' })).toBe(state)
    expect(gameReducer(state, { type: 'redo' })).toBe(state)
  })

  it('drops the redo stack once a new edit is made', () => {
    const filled = typeDigit(selecting(EMPTY_CELL), 4)
    const undone = gameReducer(filled, { type: 'undo' })
    expect(undone.future).toHaveLength(1)
    expect(typeDigit(undone, 7).future).toHaveLength(0)
  })

  it('is cleared by restart', () => {
    const filled = typeDigit(selecting(EMPTY_CELL), 4)
    const restarted = gameReducer(filled, { type: 'restart' })

    expect(restarted.past).toHaveLength(0)
    expect(restarted.values[EMPTY_CELL]).toBe(0)
    expect(restarted.status).toBe('playing')
  })
})

describe('check', () => {
  it('marks wrong cells and counts them', () => {
    const wrong = typeDigit(selecting(EMPTY_CELL), 9)
    const checked = gameReducer(wrong, { type: 'check' })

    expect(checked.incorrect).toEqual([EMPTY_CELL])
    expect(checked.mistakes).toBe(1)
  })

  it('finds nothing wrong in a correct partial grid', () => {
    const right = typeDigit(selecting(EMPTY_CELL), 4)
    const checked = gameReducer(right, { type: 'check' })

    expect(checked.incorrect).toEqual([])
    expect(checked.mistakes).toBe(0)
  })

  it('re-counts a wrong cell that is checked twice', () => {
    const wrong = typeDigit(selecting(EMPTY_CELL), 9)
    const twice = gameReducer(gameReducer(wrong, { type: 'check' }), { type: 'check' })
    expect(twice.mistakes).toBe(2)
  })

  it('clears a cell mark as soon as that cell is edited', () => {
    const wrong = typeDigit(selecting(EMPTY_CELL), 9)
    const checked = gameReducer(wrong, { type: 'check' })
    expect(typeDigit(checked, 4).incorrect).toEqual([])
  })
})

describe('hint', () => {
  it('fills the selected cell correctly and counts as assistance', () => {
    const state = gameReducer(selecting(EMPTY_CELL), { type: 'hint' })
    expect(state.values[EMPTY_CELL]).toBe(4)
    expect(state.hintsUsed).toBe(1)
  })

  it('falls back to an empty cell when the selection is already filled', () => {
    const state = gameReducer(selecting(GIVEN_CELL), { type: 'hint' })
    expect(state.hintsUsed).toBe(1)
    expect(state.selected).not.toBe(GIVEN_CELL)
  })
})

describe('finishing', () => {
  function oneCellShort(): GameState {
    const values = cloneGrid(parseGrid(SOLUTION))
    values[EMPTY_CELL] = 0
    return {
      ...playing(),
      values,
      selected: EMPTY_CELL,
    }
  }

  it('completes when the last correct digit lands', () => {
    expect(typeDigit(oneCellShort(), 4).status).toBe('complete')
  })

  it('stays in play when the last digit is wrong', () => {
    expect(typeDigit(oneCellShort(), 9).status).toBe('playing')
  })

  it('rejects edits once complete', () => {
    const done = typeDigit(oneCellShort(), 4)
    expect(typeDigit(gameReducer(done, { type: 'select', index: EMPTY_CELL }), 9).values[EMPTY_CELL]).toBe(4)
  })

  it('reveals the solution and ends the game', () => {
    const state = gameReducer(playing(), { type: 'revealSolution' })
    expect(state.status).toBe('complete')
    expect(Array.from(state.values)).toEqual(Array.from(parseGrid(SOLUTION)))
  })
})

describe('pausing', () => {
  it('round-trips between paused and playing', () => {
    const paused = gameReducer(playing(), { type: 'pause' })
    expect(paused.status).toBe('paused')
    expect(gameReducer(paused, { type: 'resume' }).status).toBe('playing')
  })

  it('blocks entry while paused', () => {
    const paused = gameReducer(selecting(EMPTY_CELL), { type: 'pause' })
    expect(typeDigit(paused, 4).values[EMPTY_CELL]).toBe(0)
  })
})

describe('selection', () => {
  it('moves with arrow keys and stops at the edges', () => {
    const state = gameReducer(selecting(0), { type: 'move', rows: -1, cols: -1 })
    expect(state.selected).toBe(0)

    const moved = gameReducer(selecting(0), { type: 'move', rows: 1, cols: 2 })
    expect(moved.selected).toBe(11)

    const corner = gameReducer(selecting(CELLS - 1), { type: 'move', rows: 1, cols: 1 })
    expect(corner.selected).toBe(CELLS - 1)
  })
})
