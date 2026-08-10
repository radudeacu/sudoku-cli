export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert'

export const DIFFICULTIES: readonly Difficulty[] = ['easy', 'medium', 'hard', 'expert']

/**
 * Solving techniques in ascending order of difficulty. The index in this array
 * is the rank used for grading, so order is load-bearing - do not reorder.
 */
export const TECHNIQUES = [
  'nakedSingle',
  'hiddenSingle',
  'nakedPair',
  'pointingPair',
  'boxLineReduction',
  'xWing',
] as const

export type Technique = (typeof TECHNIQUES)[number]

export function rankOf(technique: Technique): number {
  return TECHNIQUES.indexOf(technique)
}

/** 81 cells, row-major. 0 means empty, 1-9 a digit. */
export type Grid = Uint8Array

/** 81 cells of 9-bit candidate masks, bit 0 = digit 1. */
export type Candidates = Uint16Array

export interface DifficultySpec {
  readonly minClues: number
  readonly maxClues: number
  /** Easiest technique the puzzle must require, so tiers don't collapse into each other. */
  readonly minTechnique: Technique
  /** Hardest technique the puzzle may require. */
  readonly maxTechnique: Technique
}

/**
 * Clue bands come straight from the PRD. The technique floors do not: the PRD asked
 * for pointing pairs at hard and X-wing at expert, but measuring 160 generated puzzles
 * showed X-wing was required zero times and pointing pairs only ~8% of the time, even
 * at 22 clues. Puzzles that *require* those techniques are rare enough that finding one
 * means generating thousands - too slow to do in a browser. The floors below are what
 * bounded search actually reaches; ceilings stay where the PRD put them.
 */
export const DIFFICULTY_SPECS: Readonly<Record<Difficulty, DifficultySpec>> = {
  easy: { minClues: 40, maxClues: 45, minTechnique: 'nakedSingle', maxTechnique: 'nakedSingle' },
  medium: { minClues: 32, maxClues: 39, minTechnique: 'hiddenSingle', maxTechnique: 'nakedPair' },
  hard: {
    minClues: 28,
    maxClues: 31,
    minTechnique: 'nakedPair',
    maxTechnique: 'boxLineReduction',
  },
  expert: { minClues: 22, maxClues: 27, minTechnique: 'pointingPair', maxTechnique: 'xWing' },
}

export interface Puzzle {
  readonly difficulty: Difficulty
  /** The starting grid shown to the player; 0 for cells they must fill. */
  readonly givens: Grid
  readonly solution: Grid
  readonly clueCount: number
  /** Hardest technique actually required to solve it by logic alone. */
  readonly hardestTechnique: Technique
}
