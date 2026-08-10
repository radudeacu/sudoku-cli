import { describe, expect, it } from 'vitest'
import { generate, generateSolvedGrid } from './generator'
import { COL_UNITS, ROW_UNITS, UNITS, countClues, formatGrid } from './grid'
import { createRng } from './rng'
import { hasUniqueSolution, solve } from './solver'
import { grade } from './techniques'
import { DIFFICULTIES, DIFFICULTY_SPECS, rankOf, type Difficulty } from './types'

const SAMPLES = 5
const CLUE_TOLERANCE = 2
const TIMEOUT_MS = 120_000

/**
 * Tier-matching needs retries and costs a few hundred ms per puzzle, so the band
 * assertions run over a small sample. The invariants that would actually ruin a
 * game - two solutions, or a puzzle needing a guess - are checked over a much
 * larger sample of single-attempt puzzles, which are ~20ms each.
 */
const BULK_SAMPLES = 40

function everyUnitHoldsEveryDigit(values: Uint8Array): boolean {
  return UNITS.every((unit) => {
    const digits = new Set(unit.map((cell) => values[cell]))
    return digits.size === 9 && !digits.has(0)
  })
}

describe('generateSolvedGrid', () => {
  it('produces a complete, valid grid', () => {
    const values = generateSolvedGrid(createRng(1))
    expect(countClues(values)).toBe(81)
    expect(everyUnitHoldsEveryDigit(values)).toBe(true)
    expect(ROW_UNITS).toHaveLength(9)
    expect(COL_UNITS).toHaveLength(9)
  })

  it('produces different grids from different seeds', () => {
    const first = formatGrid(generateSolvedGrid(createRng(1)))
    const second = formatGrid(generateSolvedGrid(createRng(2)))
    expect(first).not.toBe(second)
  })

  it('is reproducible for a given seed', () => {
    expect(formatGrid(generateSolvedGrid(createRng(7)))).toBe(
      formatGrid(generateSolvedGrid(createRng(7))),
    )
  })
})

describe('generate', () => {
  it(
    'is reproducible for a given seed',
    () => {
      const first = generate('medium', { rng: createRng(99) })
      const second = generate('medium', { rng: createRng(99) })
      expect(formatGrid(first.givens)).toBe(formatGrid(second.givens))
      expect(formatGrid(first.solution)).toBe(formatGrid(second.solution))
    },
    TIMEOUT_MS,
  )

  describe.each(DIFFICULTIES)('%s puzzles in bulk', (difficulty: Difficulty) => {
    it(
      'is always uniquely solvable without guessing',
      () => {
        for (let seed = 0; seed < BULK_SAMPLES; seed++) {
          const puzzle = generate(difficulty, {
            rng: createRng(500_000 + seed),
            maxAttempts: 1,
          })

          expect(hasUniqueSolution(puzzle.givens)).toBe(true)

          const result = grade(puzzle.givens)
          expect(result.solved).toBe(true)
          expect(formatGrid(result.values)).toBe(formatGrid(puzzle.solution))
        }
      },
      TIMEOUT_MS,
    )
  })

  describe.each(DIFFICULTIES)('%s puzzles', (difficulty: Difficulty) => {
    const spec = DIFFICULTY_SPECS[difficulty]
    const puzzles = Array.from({ length: SAMPLES }, (_, seed) =>
      generate(difficulty, { rng: createRng(1000 + seed) }),
    )

    it(
      'has exactly one solution',
      () => {
        for (const puzzle of puzzles) {
          expect(hasUniqueSolution(puzzle.givens)).toBe(true)
        }
      },
      TIMEOUT_MS,
    )

    it(
      'solves to the stated solution',
      () => {
        for (const puzzle of puzzles) {
          expect(everyUnitHoldsEveryDigit(puzzle.solution)).toBe(true)
          expect(formatGrid(solve(puzzle.givens) as Uint8Array)).toBe(formatGrid(puzzle.solution))
        }
      },
      TIMEOUT_MS,
    )

    it(
      'keeps every given consistent with the solution',
      () => {
        for (const puzzle of puzzles) {
          for (let index = 0; index < 81; index++) {
            const given = puzzle.givens[index] as number
            if (given !== 0) expect(given).toBe(puzzle.solution[index])
          }
        }
      },
      TIMEOUT_MS,
    )

    it(
      'needs no guessing - logic alone reaches the solution',
      () => {
        for (const puzzle of puzzles) {
          const result = grade(puzzle.givens)
          expect(result.solved).toBe(true)
          expect(formatGrid(result.values)).toBe(formatGrid(puzzle.solution))
        }
      },
      TIMEOUT_MS,
    )

    it(
      'requires a technique inside the tier band',
      () => {
        const floor = rankOf(spec.minTechnique)
        const ceiling = rankOf(spec.maxTechnique)
        for (const puzzle of puzzles) {
          const rank = rankOf(puzzle.hardestTechnique)
          expect(rank).toBeGreaterThanOrEqual(floor)
          expect(rank).toBeLessThanOrEqual(ceiling)
        }
      },
      TIMEOUT_MS,
    )

    it(
      'lands within the clue band plus tolerance',
      () => {
        for (const puzzle of puzzles) {
          expect(puzzle.clueCount).toBe(countClues(puzzle.givens))
          expect(puzzle.clueCount).toBeGreaterThanOrEqual(spec.minClues - CLUE_TOLERANCE)
          expect(puzzle.clueCount).toBeLessThanOrEqual(spec.maxClues + CLUE_TOLERANCE)
        }
      },
      TIMEOUT_MS,
    )
  })
})
