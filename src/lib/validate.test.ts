import { describe, expect, it } from 'vitest'
import { CELLS, parseGrid } from './grid'
import { findIncorrectCells, isComplete, isSolved } from './validate'

const SOLUTION =
  '534678912672195348198342567859761423426853791713924856961537284287419635345286179'

describe('isComplete', () => {
  it('is false while any cell is empty', () => {
    const values = parseGrid(SOLUTION)
    values[17] = 0
    expect(isComplete(values)).toBe(false)
  })

  it('is true for a full grid, right or wrong', () => {
    const values = parseGrid(SOLUTION)
    values[17] = 1
    expect(isComplete(values)).toBe(true)
  })

  it('is false for an empty grid', () => {
    expect(isComplete(new Uint8Array(CELLS))).toBe(false)
  })
})

describe('findIncorrectCells', () => {
  const solution = parseGrid(SOLUTION)

  it('finds nothing when entries match', () => {
    expect(findIncorrectCells(parseGrid(SOLUTION), solution)).toEqual([])
  })

  it('ignores empty cells, so a partial grid is not "wrong"', () => {
    const values = parseGrid(SOLUTION)
    values[3] = 0
    values[44] = 0
    expect(findIncorrectCells(values, solution)).toEqual([])
  })

  it('reports each filled cell that disagrees with the solution', () => {
    const values = parseGrid(SOLUTION)
    values[3] = ((solution[3] as number) % 9) + 1
    values[44] = ((solution[44] as number) % 9) + 1
    expect(findIncorrectCells(values, solution)).toEqual([3, 44])
  })
})

describe('isSolved', () => {
  const solution = parseGrid(SOLUTION)

  it('needs the grid both full and correct', () => {
    expect(isSolved(parseGrid(SOLUTION), solution)).toBe(true)

    const incomplete = parseGrid(SOLUTION)
    incomplete[0] = 0
    expect(isSolved(incomplete, solution)).toBe(false)

    const wrong = parseGrid(SOLUTION)
    wrong[0] = ((solution[0] as number) % 9) + 1
    expect(isSolved(wrong, solution)).toBe(false)
  })
})
