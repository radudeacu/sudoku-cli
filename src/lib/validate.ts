import { CELLS } from './grid'
import type { Grid } from './types'

export function isComplete(values: Grid): boolean {
  for (let index = 0; index < CELLS; index++) {
    if (values[index] === 0) return false
  }
  return true
}

/**
 * Filled cells that disagree with the solution. This is what Check reports -
 * the app never flags conflicts while typing, so correctness is judged against
 * the known solution rather than against the player's other entries.
 */
export function findIncorrectCells(values: Grid, solution: Grid): number[] {
  const incorrect: number[] = []
  for (let index = 0; index < CELLS; index++) {
    const entered = values[index] as number
    if (entered !== 0 && entered !== solution[index]) incorrect.push(index)
  }
  return incorrect
}

export function isSolved(values: Grid, solution: Grid): boolean {
  return isComplete(values) && findIncorrectCells(values, solution).length === 0
}
