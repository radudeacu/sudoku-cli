import { formatGrid, parseGrid } from '../lib/grid'
import { SCHEMA_VERSION, type SavedGame } from '../lib/storage'
import type { Difficulty, Puzzle } from '../lib/types'
import { initialGameState, type GameState } from './gameReducer'

export interface RestoredGame {
  readonly state: GameState
  readonly difficulty: Difficulty
  readonly elapsedMs: number
}

/**
 * Only an in-progress game is worth saving. Undo history is deliberately left out:
 * it would multiply the payload for something a resumed session rarely needs.
 */
export function toSavedGame(
  state: GameState,
  difficulty: Difficulty,
  elapsedMs: number,
): SavedGame | null {
  if (!state.puzzle) return null
  if (state.status !== 'playing' && state.status !== 'paused') return null

  return {
    version: SCHEMA_VERSION,
    difficulty,
    givens: formatGrid(state.puzzle.givens),
    solution: formatGrid(state.puzzle.solution),
    values: formatGrid(state.values),
    notes: Array.from(state.notes),
    clueCount: state.puzzle.clueCount,
    hardestTechnique: state.puzzle.hardestTechnique,
    selected: state.selected,
    notesMode: state.notesMode,
    mistakes: state.mistakes,
    hintsUsed: state.hintsUsed,
    elapsedMs,
    paused: state.status === 'paused',
  }
}

export function fromSavedGame(saved: SavedGame): RestoredGame {
  const puzzle: Puzzle = {
    difficulty: saved.difficulty,
    givens: parseGrid(saved.givens),
    solution: parseGrid(saved.solution),
    clueCount: saved.clueCount,
    hardestTechnique: saved.hardestTechnique,
  }

  return {
    state: {
      ...initialGameState(),
      puzzle,
      values: parseGrid(saved.values),
      notes: Uint16Array.from(saved.notes),
      selected: saved.selected,
      notesMode: saved.notesMode,
      mistakes: saved.mistakes,
      hintsUsed: saved.hintsUsed,
      status: saved.paused ? 'paused' : 'playing',
    },
    difficulty: saved.difficulty,
    elapsedMs: saved.elapsedMs,
  }
}
