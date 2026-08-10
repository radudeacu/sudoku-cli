import { CELLS, PEERS, SIZE, cloneGrid, countClues, emptyGrid } from './grid'
import { createRng, shuffle, type Rng } from './rng'
import { countSolutions } from './solver'
import { grade } from './techniques'
import {
  DIFFICULTY_SPECS,
  rankOf,
  type Difficulty,
  type DifficultySpec,
  type Grid,
  type Puzzle,
} from './types'

/**
 * The PRD pins both a clue count and a technique tier per difficulty, and the two
 * do not always co-occur. Technique tier is authoritative; clue count is a target
 * this far either side of the stated band.
 */
const CLUE_TOLERANCE = 2

export interface GenerateOptions {
  readonly rng?: Rng
  readonly maxAttempts?: number
}

function isPlacementLegal(values: Grid, index: number, digit: number): boolean {
  for (const peer of PEERS[index] as readonly number[]) {
    if (values[peer] === digit) return false
  }
  return true
}

function fillFrom(values: Grid, index: number, rng: Rng): boolean {
  if (index === CELLS) return true
  const digits = shuffle(
    Array.from({ length: SIZE }, (_, offset) => offset + 1),
    rng,
  )
  for (const digit of digits) {
    if (!isPlacementLegal(values, index, digit)) continue
    values[index] = digit
    if (fillFrom(values, index + 1, rng)) return true
    values[index] = 0
  }
  return false
}

/** A complete, valid, randomly ordered solution grid. */
export function generateSolvedGrid(rng: Rng): Grid {
  const values = emptyGrid()
  if (!fillFrom(values, 0, rng)) {
    throw new Error('Could not fill a complete grid')
  }
  return values
}

/**
 * Removes clues in random order, keeping a removal only when the grid still has
 * exactly one solution and stays within the tier's technique ceiling.
 */
function digOut(
  solution: Grid,
  spec: DifficultySpec,
  rng: Rng,
  difficulty: Difficulty,
  targetClues: number,
): Puzzle | null {
  const values = cloneGrid(solution)
  const order = shuffle(Array.from({ length: CELLS }, (_, index) => index), rng)
  const ceiling = rankOf(spec.maxTechnique)
  let clues = CELLS

  for (const index of order) {
    if (clues <= targetClues) break

    const removed = values[index] as number
    values[index] = 0

    if (countSolutions(values, 2) !== 1) {
      values[index] = removed
      continue
    }

    const result = grade(values)
    if (!result.solved || result.hardestTechnique === null) {
      values[index] = removed
      continue
    }
    if (rankOf(result.hardestTechnique) > ceiling) {
      values[index] = removed
      continue
    }

    clues--
  }

  const final = grade(values)
  if (!final.solved || final.hardestTechnique === null) return null

  return {
    difficulty,
    givens: values,
    solution: cloneGrid(solution),
    clueCount: countClues(values),
    hardestTechnique: final.hardestTechnique,
  }
}

/** 0 means the puzzle matches the tier exactly; higher is further off. */
function distanceFromSpec(puzzle: Puzzle, spec: DifficultySpec): number {
  const rank = rankOf(puzzle.hardestTechnique)
  const floor = rankOf(spec.minTechnique)
  const ceiling = rankOf(spec.maxTechnique)

  let distance = 0
  // Technique is authoritative, so weight it far above clue count.
  if (rank < floor) distance += (floor - rank) * 100
  if (rank > ceiling) distance += (rank - ceiling) * 100

  const lowest = spec.minClues - CLUE_TOLERANCE
  const highest = spec.maxClues + CLUE_TOLERANCE
  if (puzzle.clueCount < lowest) distance += lowest - puzzle.clueCount
  if (puzzle.clueCount > highest) distance += puzzle.clueCount - highest

  return distance
}

/**
 * Generates a puzzle for the tier. Retries whole puzzles rather than backtracking,
 * and returns the closest match if no attempt lands the tier exactly - a slightly
 * off-tier puzzle beats hanging the caller.
 */
export function generate(difficulty: Difficulty, options: GenerateOptions = {}): Puzzle {
  const rng = options.rng ?? createRng((Math.random() * 0x1_0000_0000) >>> 0)
  const maxAttempts = options.maxAttempts ?? 40
  const spec = DIFFICULTY_SPECS[difficulty]

  let best: Puzzle | null = null
  let bestDistance = Number.POSITIVE_INFINITY

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Vary the clue count across the band so a tier does not always look identical.
    const span = spec.maxClues - spec.minClues + 1
    const targetClues = spec.minClues + Math.floor(rng() * span)

    const candidate = digOut(generateSolvedGrid(rng), spec, rng, difficulty, targetClues)
    if (!candidate) continue

    const distance = distanceFromSpec(candidate, spec)
    if (distance === 0) return candidate
    if (distance < bestDistance) {
      bestDistance = distance
      best = candidate
    }
  }

  if (!best) throw new Error(`Could not generate a ${difficulty} puzzle`)
  return best
}
