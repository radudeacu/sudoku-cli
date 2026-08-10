import { describe, expect, it } from 'vitest'
import { CELLS, formatGrid, parseGrid } from './grid'
import { grade } from './techniques'

const PUZZLE =
  '530070000600195000098000060800060003400803001700020006060000280000419005000080079'
const SOLUTION =
  '534678912672195348198342567859761423426853791713924856961537284287419635345286179'

describe('grade', () => {
  it('solves a known puzzle by logic alone and lands on the real solution', () => {
    const result = grade(parseGrid(PUZZLE))
    expect(result.solved).toBe(true)
    expect(formatGrid(result.values)).toBe(SOLUTION)
  })

  it('reports a single missing cell as a naked single', () => {
    const values = parseGrid(SOLUTION)
    values[40] = 0
    const result = grade(values)

    expect(result.solved).toBe(true)
    expect(result.hardestTechnique).toBe('nakedSingle')
    expect(formatGrid(result.values)).toBe(SOLUTION)
  })

  it('makes no progress on an empty grid', () => {
    const result = grade(new Uint8Array(CELLS))
    expect(result.solved).toBe(false)
    expect(result.hardestTechnique).toBeNull()
  })

  it('does not mutate the grid it is given', () => {
    const values = parseGrid(PUZZLE)
    const before = formatGrid(values)
    grade(values)
    expect(formatGrid(values)).toBe(before)
  })

  it('reports no technique for an already-complete grid', () => {
    const result = grade(parseGrid(SOLUTION))
    expect(result.solved).toBe(true)
    expect(result.hardestTechnique).toBeNull()
  })
})
