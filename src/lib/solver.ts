import {
  ALL_DIGITS_MASK,
  CELLS,
  PEERS,
  UNITS_OF_CELL,
  bitFor,
  digitsOf,
  firstDigit,
  popcount,
} from './grid'
import type { Grid } from './types'

interface SearchState {
  values: Uint8Array
  candidates: Uint16Array
}

function cloneState(state: SearchState): SearchState {
  return {
    values: Uint8Array.from(state.values),
    candidates: Uint16Array.from(state.candidates),
  }
}

/**
 * Removes a digit from a cell's candidates and propagates the two consequences:
 * a cell left with one candidate is placed, and a digit left with one home in a
 * unit is placed there. Returns false when the elimination makes the grid unsolvable.
 */
function eliminate(state: SearchState, index: number, digit: number): boolean {
  const mask = bitFor(digit)
  const current = state.candidates[index] as number
  if ((current & mask) === 0) return true

  const remaining = current & ~mask
  state.candidates[index] = remaining
  if (remaining === 0) return false

  if (popcount(remaining) === 1) {
    const only = firstDigit(remaining)
    state.values[index] = only
    for (const peer of PEERS[index] as readonly number[]) {
      if (!eliminate(state, peer, only)) return false
    }
  }

  for (const unit of UNITS_OF_CELL[index] as readonly (readonly number[])[]) {
    let home = -1
    let places = 0
    for (const cell of unit) {
      if (((state.candidates[cell] as number) & mask) !== 0) {
        places++
        home = cell
      }
    }
    if (places === 0) return false
    if (places === 1 && state.values[home] === 0) {
      if (!assign(state, home, digit)) return false
    }
  }

  return true
}

function assign(state: SearchState, index: number, digit: number): boolean {
  const others = (state.candidates[index] as number) & ~bitFor(digit)
  for (const other of digitsOf(others)) {
    if (!eliminate(state, index, other)) return false
  }
  return true
}

function createState(values: Grid): SearchState | null {
  const state: SearchState = {
    values: new Uint8Array(CELLS),
    candidates: new Uint16Array(CELLS).fill(ALL_DIGITS_MASK),
  }
  for (let index = 0; index < CELLS; index++) {
    const digit = values[index] as number
    if (digit !== 0 && !assign(state, index, digit)) return null
  }
  return state
}

/** Picks the unfilled cell with the fewest candidates, or -1 when the grid is full. */
function selectCell(state: SearchState): number {
  let best = -1
  let bestCount = 10
  for (let index = 0; index < CELLS; index++) {
    if (state.values[index] !== 0) continue
    const count = popcount(state.candidates[index] as number)
    if (count < bestCount) {
      bestCount = count
      best = index
      if (count === 2) break
    }
  }
  return best
}

function search(state: SearchState, solutions: Grid[], limit: number): void {
  if (solutions.length >= limit) return

  const index = selectCell(state)
  if (index === -1) {
    solutions.push(Uint8Array.from(state.values))
    return
  }

  for (const digit of digitsOf(state.candidates[index] as number)) {
    if (solutions.length >= limit) return
    const branch = cloneState(state)
    if (assign(branch, index, digit)) {
      search(branch, solutions, limit)
    }
  }
}

/** The first solution found, or null when the grid has none. */
export function solve(values: Grid): Grid | null {
  const state = createState(values)
  if (!state) return null
  const solutions: Grid[] = []
  search(state, solutions, 1)
  return solutions[0] ?? null
}

/**
 * Counts solutions, stopping as soon as `limit` are found. The default of 2 is
 * all a uniqueness check needs, and stops pathological grids running forever.
 */
export function countSolutions(values: Grid, limit = 2): number {
  const state = createState(values)
  if (!state) return 0
  const solutions: Grid[] = []
  search(state, solutions, limit)
  return solutions.length
}

export function hasUniqueSolution(values: Grid): boolean {
  return countSolutions(values, 2) === 1
}
