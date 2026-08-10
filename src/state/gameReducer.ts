import { CELLS, PEERS, SIZE, bitFor, cloneGrid, colOf, rowOf } from '../lib/grid'
import type { Grid, Puzzle } from '../lib/types'
import { findIncorrectCells, isSolved } from '../lib/validate'

export type GameStatus = 'generating' | 'playing' | 'paused' | 'complete'

export interface Snapshot {
  readonly values: Uint8Array
  readonly notes: Uint16Array
}

export interface GameState {
  readonly puzzle: Puzzle | null
  readonly values: Uint8Array
  /** Candidate marks per cell, as 9-bit masks. Independent of `values`. */
  readonly notes: Uint16Array
  readonly selected: number | null
  readonly notesMode: boolean
  readonly mistakes: number
  /** Cells the last Check found wrong. Cleared per cell as it is edited. */
  readonly incorrect: readonly number[]
  readonly hintsUsed: number
  readonly status: GameStatus
  readonly past: readonly Snapshot[]
  readonly future: readonly Snapshot[]
}

export type GameAction =
  | { type: 'startGenerating' }
  | { type: 'loadPuzzle'; puzzle: Puzzle }
  | { type: 'restore'; state: GameState }
  | { type: 'select'; index: number | null }
  | { type: 'move'; rows: number; cols: number }
  /** `asNote` overrides notes mode for one entry, which is what Shift+digit does. */
  | { type: 'setDigit'; digit: number; autoClearNotes: boolean; asNote?: boolean }
  | { type: 'clearCell' }
  | { type: 'toggleNotesMode' }
  | { type: 'undo' }
  | { type: 'redo' }
  | { type: 'check' }
  | { type: 'hint' }
  | { type: 'restart' }
  | { type: 'revealSolution' }
  | { type: 'pause' }
  | { type: 'resume' }

export function initialGameState(): GameState {
  return {
    puzzle: null,
    values: new Uint8Array(CELLS),
    notes: new Uint16Array(CELLS),
    selected: null,
    notesMode: false,
    mistakes: 0,
    incorrect: [],
    hintsUsed: 0,
    status: 'generating',
    past: [],
    future: [],
  }
}

function stateForPuzzle(puzzle: Puzzle): GameState {
  return {
    ...initialGameState(),
    puzzle,
    values: cloneGrid(puzzle.givens),
    status: 'playing',
  }
}

function snapshotOf(state: GameState): Snapshot {
  return { values: Uint8Array.from(state.values), notes: Uint16Array.from(state.notes) }
}

export function isGiven(state: GameState, index: number): boolean {
  return state.puzzle !== null && state.puzzle.givens[index] !== 0
}

/** Editing a cell clears any red mark on it, per the PRD. */
function withoutMark(incorrect: readonly number[], index: number): readonly number[] {
  return incorrect.includes(index) ? incorrect.filter((cell) => cell !== index) : incorrect
}

function completedIfSolved(state: GameState): GameState {
  if (state.puzzle && isSolved(state.values, state.puzzle.solution)) {
    return { ...state, status: 'complete', selected: null }
  }
  return state
}

/** Applies an edit, pushing the previous board onto the undo stack. */
function edit(state: GameState, mutate: (draft: Snapshot) => void): GameState {
  const draft = snapshotOf(state)
  mutate(draft)

  return {
    ...state,
    values: draft.values,
    notes: draft.notes,
    past: [...state.past, snapshotOf(state)],
    future: [],
  }
}

function clearNotesFromPeers(draft: Snapshot, index: number, digit: number): void {
  const without = ~bitFor(digit)
  for (const peer of PEERS[index] as readonly number[]) {
    draft.notes[peer] = (draft.notes[peer] as number) & without
  }
}

function setDigit(
  state: GameState,
  digit: number,
  autoClearNotes: boolean,
  asNote?: boolean,
): GameState {
  const index = state.selected
  if (index === null || isGiven(state, index) || state.status !== 'playing') return state

  if (asNote ?? state.notesMode) {
    return {
      ...edit(state, (draft) => {
        draft.notes[index] = (draft.notes[index] as number) ^ bitFor(digit)
        draft.values[index] = 0
      }),
      incorrect: withoutMark(state.incorrect, index),
    }
  }

  // Typing the digit already there clears it, which is how most Sudoku apps behave.
  const isRepeat = state.values[index] === digit
  const next = edit(state, (draft) => {
    draft.values[index] = isRepeat ? 0 : digit
    draft.notes[index] = 0
    if (!isRepeat && autoClearNotes) clearNotesFromPeers(draft, index, digit)
  })

  return completedIfSolved({ ...next, incorrect: withoutMark(state.incorrect, index) })
}

function clearCell(state: GameState): GameState {
  const index = state.selected
  if (index === null || isGiven(state, index) || state.status !== 'playing') return state
  if (state.values[index] === 0 && state.notes[index] === 0) return state

  return {
    ...edit(state, (draft) => {
      draft.values[index] = 0
      draft.notes[index] = 0
    }),
    incorrect: withoutMark(state.incorrect, index),
  }
}

function moveSelection(state: GameState, rows: number, cols: number): GameState {
  const from = state.selected ?? 0
  const row = Math.min(SIZE - 1, Math.max(0, rowOf(from) + rows))
  const col = Math.min(SIZE - 1, Math.max(0, colOf(from) + cols))
  return { ...state, selected: row * SIZE + col }
}

function undo(state: GameState): GameState {
  const previous = state.past[state.past.length - 1]
  if (!previous) return state

  return {
    ...state,
    values: Uint8Array.from(previous.values),
    notes: Uint16Array.from(previous.notes),
    past: state.past.slice(0, -1),
    future: [snapshotOf(state), ...state.future],
    incorrect: [],
  }
}

function redo(state: GameState): GameState {
  const next = state.future[0]
  if (!next) return state

  return completedIfSolved({
    ...state,
    values: Uint8Array.from(next.values),
    notes: Uint16Array.from(next.notes),
    past: [...state.past, snapshotOf(state)],
    future: state.future.slice(1),
    incorrect: [],
  })
}

/** Check counts every wrong cell it finds, so repeated checks of the same error re-count it. */
function check(state: GameState): GameState {
  if (!state.puzzle || state.status !== 'playing') return state
  const incorrect = findIncorrectCells(state.values, state.puzzle.solution)
  return { ...state, incorrect, mistakes: state.mistakes + incorrect.length }
}

function firstEmptyCell(values: Grid): number | null {
  for (let index = 0; index < CELLS; index++) {
    if (values[index] === 0) return index
  }
  return null
}

function hint(state: GameState): GameState {
  if (!state.puzzle || state.status !== 'playing') return state

  const target =
    state.selected !== null && state.values[state.selected] === 0
      ? state.selected
      : firstEmptyCell(state.values)
  if (target === null) return state

  const digit = state.puzzle.solution[target] as number
  const next = edit(state, (draft) => {
    draft.values[target] = digit
    draft.notes[target] = 0
    clearNotesFromPeers(draft, target, digit)
  })

  return completedIfSolved({
    ...next,
    selected: target,
    hintsUsed: state.hintsUsed + 1,
    incorrect: withoutMark(state.incorrect, target),
  })
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'startGenerating':
      return { ...initialGameState(), status: 'generating' }

    case 'loadPuzzle':
      return stateForPuzzle(action.puzzle)

    case 'restore':
      return action.state

    case 'select':
      return { ...state, selected: action.index }

    case 'move':
      return moveSelection(state, action.rows, action.cols)

    case 'setDigit':
      return setDigit(state, action.digit, action.autoClearNotes, action.asNote)

    case 'clearCell':
      return clearCell(state)

    case 'toggleNotesMode':
      return { ...state, notesMode: !state.notesMode }

    case 'undo':
      return undo(state)

    case 'redo':
      return redo(state)

    case 'check':
      return check(state)

    case 'hint':
      return hint(state)

    case 'restart':
      return state.puzzle ? stateForPuzzle(state.puzzle) : state

    case 'revealSolution':
      return state.puzzle
        ? {
            ...state,
            values: cloneGrid(state.puzzle.solution),
            notes: new Uint16Array(CELLS),
            incorrect: [],
            status: 'complete',
            past: [],
            future: [],
          }
        : state

    case 'pause':
      return state.status === 'playing' ? { ...state, status: 'paused' } : state

    case 'resume':
      return state.status === 'paused' ? { ...state, status: 'playing' } : state

    default:
      return state
  }
}
