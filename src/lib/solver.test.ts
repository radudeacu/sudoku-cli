import { describe, expect, it } from 'vitest'
import { CELLS, cellIndex, formatGrid, parseGrid, rowOf } from './grid'
import { countSolutions, hasUniqueSolution, solve } from './solver'

const PUZZLE =
  '530070000600195000098000060800060003400803001700020006060000280000419005000080079'
const SOLUTION =
  '534678912672195348198342567859761423426853791713924856961537284287419635345286179'

describe('solve', () => {
  it('solves a known puzzle exactly', () => {
    const solved = solve(parseGrid(PUZZLE))
    expect(solved).not.toBeNull()
    expect(formatGrid(solved as Uint8Array)).toBe(SOLUTION)
  })

  it('returns an already-solved grid unchanged', () => {
    const solved = solve(parseGrid(SOLUTION))
    expect(formatGrid(solved as Uint8Array)).toBe(SOLUTION)
  })

  it('returns null for a contradictory grid', () => {
    const values = parseGrid(PUZZLE)
    // Two 5s in the top row.
    values[1] = 5
    expect(solve(values)).toBeNull()
  })

  it('solves an empty grid', () => {
    const solved = solve(new Uint8Array(CELLS))
    expect(solved).not.toBeNull()
    expect(formatGrid(solved as Uint8Array)).not.toContain('.')
  })
})

describe('countSolutions', () => {
  it('finds exactly one solution for a proper puzzle', () => {
    expect(countSolutions(parseGrid(PUZZLE))).toBe(1)
    expect(hasUniqueSolution(parseGrid(PUZZLE))).toBe(true)
  })

  it('finds none for a contradictory grid', () => {
    const values = parseGrid(PUZZLE)
    values[1] = 5
    expect(countSolutions(values)).toBe(0)
  })

  it('stops at the limit rather than enumerating an empty grid', () => {
    expect(countSolutions(new Uint8Array(CELLS), 2)).toBe(2)
    expect(countSolutions(new Uint8Array(CELLS), 5)).toBe(5)
  })

  it('detects the two solutions of a deadly rectangle', () => {
    const solution = parseGrid(SOLUTION)

    // Four cells at two rows and two columns holding a,b / b,a can always be
    // swapped, so blanking them must leave more than one solution.
    const rectangle = findDeadlyRectangle(solution)
    expect(rectangle).not.toBeNull()

    const values = parseGrid(SOLUTION)
    for (const index of rectangle as number[]) values[index] = 0

    expect(countSolutions(values, 2)).toBe(2)
    expect(hasUniqueSolution(values)).toBe(false)
  })
})

/** Finds four cells forming an a,b / b,a rectangle within a single band of boxes. */
function findDeadlyRectangle(solution: Uint8Array): number[] | null {
  for (let rowA = 0; rowA < 9; rowA++) {
    for (let rowB = rowA + 1; rowB < 9; rowB++) {
      // Same band keeps each box balanced across the swap.
      if (Math.floor(rowA / 3) !== Math.floor(rowB / 3)) continue

      for (let colA = 0; colA < 9; colA++) {
        for (let colB = colA + 1; colB < 9; colB++) {
          const topLeft = cellIndex(rowA, colA)
          const topRight = cellIndex(rowA, colB)
          const bottomLeft = cellIndex(rowB, colA)
          const bottomRight = cellIndex(rowB, colB)

          if (solution[topLeft] !== solution[bottomRight]) continue
          if (solution[topRight] !== solution[bottomLeft]) continue
          if (solution[topLeft] === solution[topRight]) continue

          return [topLeft, topRight, bottomLeft, bottomRight]
        }
      }
    }
  }
  return null
}

describe('findDeadlyRectangle helper', () => {
  it('returns cells from two rows in the same band', () => {
    const rectangle = findDeadlyRectangle(parseGrid(SOLUTION)) as number[]
    const rows = [...new Set(rectangle.map(rowOf))]
    expect(rows).toHaveLength(2)
    expect(Math.floor((rows[0] as number) / 3)).toBe(Math.floor((rows[1] as number) / 3))
  })
})
