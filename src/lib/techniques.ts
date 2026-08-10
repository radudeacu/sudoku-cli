import {
  BOX_UNITS,
  CELLS,
  COL_UNITS,
  PEERS,
  ROW_UNITS,
  SIZE,
  UNITS,
  bitFor,
  boxOf,
  candidatesFrom,
  cloneGrid,
  colOf,
  firstDigit,
  popcount,
  rowOf,
} from './grid'
import { isComplete } from './validate'
import { TECHNIQUES, type Grid, type Technique } from './types'

type Board = { values: Uint8Array; candidates: Uint16Array }

/** Each technique returns true when it changed the board. */
type TechniqueFn = (board: Board) => boolean

function place(board: Board, index: number, digit: number): void {
  board.values[index] = digit
  board.candidates[index] = bitFor(digit)
  const without = ~bitFor(digit)
  for (const peer of PEERS[index] as readonly number[]) {
    if (board.values[peer] === 0) {
      board.candidates[peer] = (board.candidates[peer] as number) & without
    }
  }
}

function eliminateFrom(board: Board, cell: number, mask: number): boolean {
  const before = board.candidates[cell] as number
  const after = before & ~mask
  if (after === before) return false
  board.candidates[cell] = after
  return true
}

function emptyCellsIn(board: Board, unit: readonly number[]): number[] {
  return unit.filter((cell) => board.values[cell] === 0)
}

function candidateCellsFor(board: Board, unit: readonly number[], mask: number): number[] {
  return unit.filter(
    (cell) => board.values[cell] === 0 && ((board.candidates[cell] as number) & mask) !== 0,
  )
}

const nakedSingle: TechniqueFn = (board) => {
  for (let index = 0; index < CELLS; index++) {
    if (board.values[index] !== 0) continue
    const mask = board.candidates[index] as number
    if (popcount(mask) === 1) {
      place(board, index, firstDigit(mask))
      return true
    }
  }
  return false
}

const hiddenSingle: TechniqueFn = (board) => {
  for (const unit of UNITS) {
    for (let digit = 1; digit <= SIZE; digit++) {
      const mask = bitFor(digit)
      if (unit.some((cell) => board.values[cell] === digit)) continue
      const places = candidateCellsFor(board, unit, mask)
      if (places.length === 1) {
        place(board, places[0] as number, digit)
        return true
      }
    }
  }
  return false
}

const nakedPair: TechniqueFn = (board) => {
  for (const unit of UNITS) {
    const empties = emptyCellsIn(board, unit)
    for (let a = 0; a < empties.length; a++) {
      const first = empties[a] as number
      const mask = board.candidates[first] as number
      if (popcount(mask) !== 2) continue

      for (let b = a + 1; b < empties.length; b++) {
        const second = empties[b] as number
        if (board.candidates[second] !== mask) continue

        let changed = false
        for (const cell of empties) {
          if (cell === first || cell === second) continue
          if (eliminateFrom(board, cell, mask)) changed = true
        }
        if (changed) return true
      }
    }
  }
  return false
}

/** A digit confined to one row or column within a box is eliminated from the rest of that line. */
const pointingPair: TechniqueFn = (board) => {
  for (let box = 0; box < SIZE; box++) {
    const cells = BOX_UNITS[box] as readonly number[]
    for (let digit = 1; digit <= SIZE; digit++) {
      const mask = bitFor(digit)
      const places = candidateCellsFor(board, cells, mask)
      if (places.length < 2) continue

      const anchor = places[0] as number
      const sharesRow = places.every((cell) => rowOf(cell) === rowOf(anchor))
      const sharesCol = places.every((cell) => colOf(cell) === colOf(anchor))
      if (!sharesRow && !sharesCol) continue

      const line = sharesRow
        ? (ROW_UNITS[rowOf(anchor)] as readonly number[])
        : (COL_UNITS[colOf(anchor)] as readonly number[])

      let changed = false
      for (const cell of line) {
        if (boxOf(cell) === box || board.values[cell] !== 0) continue
        if (eliminateFrom(board, cell, mask)) changed = true
      }
      if (changed) return true
    }
  }
  return false
}

/** A digit confined to one box within a row or column is eliminated from the rest of that box. */
const boxLineReduction: TechniqueFn = (board) => {
  const lines = [...ROW_UNITS, ...COL_UNITS]
  for (const line of lines) {
    for (let digit = 1; digit <= SIZE; digit++) {
      const mask = bitFor(digit)
      const places = candidateCellsFor(board, line, mask)
      if (places.length < 2) continue

      const box = boxOf(places[0] as number)
      if (!places.every((cell) => boxOf(cell) === box)) continue

      let changed = false
      for (const cell of BOX_UNITS[box] as readonly number[]) {
        if (line.includes(cell) || board.values[cell] !== 0) continue
        if (eliminateFrom(board, cell, mask)) changed = true
      }
      if (changed) return true
    }
  }
  return false
}

/**
 * Two lines where a digit has exactly two homes, sharing the same pair of cross
 * lines, form a rectangle: the digit can be removed from those cross lines elsewhere.
 */
function xWingOverLines(
  board: Board,
  lines: readonly (readonly number[])[],
  crossIndexOf: (cell: number) => number,
  crossLines: readonly (readonly number[])[],
): boolean {
  for (let digit = 1; digit <= SIZE; digit++) {
    const mask = bitFor(digit)
    const pairs = lines.map((line) => {
      const places = candidateCellsFor(board, line, mask)
      return places.length === 2 ? places : null
    })

    for (let a = 0; a < pairs.length; a++) {
      const first = pairs[a]
      if (!first) continue
      const crossA = crossIndexOf(first[0] as number)
      const crossB = crossIndexOf(first[1] as number)

      for (let b = a + 1; b < pairs.length; b++) {
        const second = pairs[b]
        if (!second) continue
        if (crossIndexOf(second[0] as number) !== crossA) continue
        if (crossIndexOf(second[1] as number) !== crossB) continue

        let changed = false
        for (const cross of [crossA, crossB]) {
          for (const cell of crossLines[cross] as readonly number[]) {
            if (board.values[cell] !== 0) continue
            if (first.includes(cell) || second.includes(cell)) continue
            if (eliminateFrom(board, cell, mask)) changed = true
          }
        }
        if (changed) return true
      }
    }
  }
  return false
}

const xWing: TechniqueFn = (board) =>
  xWingOverLines(board, ROW_UNITS, colOf, COL_UNITS) ||
  xWingOverLines(board, COL_UNITS, rowOf, ROW_UNITS)

const TECHNIQUE_FNS: Readonly<Record<Technique, TechniqueFn>> = {
  nakedSingle,
  hiddenSingle,
  nakedPair,
  pointingPair,
  boxLineReduction,
  xWing,
}

export interface GradeResult {
  /** True when logic alone finished the grid - no guessing was needed. */
  readonly solved: boolean
  /** Hardest technique the solve actually required, or null if nothing was applied. */
  readonly hardestTechnique: Technique | null
  /**
   * How far logic got. Exposed so tests can assert it matches the real solution -
   * a technique that eliminates too aggressively would otherwise "solve" grids wrongly.
   */
  readonly values: Grid
}

/**
 * Solves by applying techniques cheapest-first, restarting from the cheapest after
 * every change, and recording the hardest one that was ever needed. That "restart"
 * matters: it stops a puzzle being graded hard because an expensive technique
 * happened to fire before a cheap one would have.
 */
export function grade(input: Grid): GradeResult {
  const board: Board = { values: cloneGrid(input), candidates: candidatesFrom(input) }

  let hardestRank = -1
  let progressed = true
  while (progressed) {
    progressed = false
    for (let rank = 0; rank < TECHNIQUES.length; rank++) {
      const technique = TECHNIQUES[rank] as Technique
      if (TECHNIQUE_FNS[technique](board)) {
        if (rank > hardestRank) hardestRank = rank
        progressed = true
        break
      }
    }
  }

  return {
    solved: isComplete(board.values),
    hardestTechnique: hardestRank >= 0 ? (TECHNIQUES[hardestRank] as Technique) : null,
    values: board.values,
  }
}
