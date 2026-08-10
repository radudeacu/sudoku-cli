import { describe, expect, it } from 'vitest'
import {
  ALL_DIGITS_MASK,
  BOX_UNITS,
  CELLS,
  PEERS,
  UNITS,
  bitFor,
  boxOf,
  candidatesFrom,
  colOf,
  countClues,
  digitsOf,
  firstDigit,
  formatGrid,
  parseGrid,
  popcount,
  rowOf,
} from './grid'

describe('coordinates', () => {
  it('maps index 0 to the top-left cell', () => {
    expect(rowOf(0)).toBe(0)
    expect(colOf(0)).toBe(0)
    expect(boxOf(0)).toBe(0)
  })

  it('maps index 80 to the bottom-right cell', () => {
    expect(rowOf(80)).toBe(8)
    expect(colOf(80)).toBe(8)
    expect(boxOf(80)).toBe(8)
  })

  it('assigns the centre box to the middle nine cells', () => {
    expect(boxOf(40)).toBe(4)
    expect(BOX_UNITS[4]).toContain(40)
  })
})

describe('bit helpers', () => {
  it('round-trips digits through masks', () => {
    for (let digit = 1; digit <= 9; digit++) {
      expect(firstDigit(bitFor(digit))).toBe(digit)
      expect(popcount(bitFor(digit))).toBe(1)
    }
  })

  it('returns the lowest digit of a multi-digit mask', () => {
    expect(firstDigit(bitFor(3) | bitFor(7))).toBe(3)
    expect(digitsOf(bitFor(3) | bitFor(7))).toEqual([3, 7])
  })

  it('treats an empty mask as no digit', () => {
    expect(firstDigit(0)).toBe(0)
    expect(popcount(0)).toBe(0)
    expect(popcount(ALL_DIGITS_MASK)).toBe(9)
  })
})

describe('units and peers', () => {
  it('builds 27 units of 9 cells', () => {
    expect(UNITS).toHaveLength(27)
    for (const unit of UNITS) expect(unit).toHaveLength(9)
  })

  it('gives every cell exactly 20 peers, never itself', () => {
    for (let index = 0; index < CELLS; index++) {
      const peers = PEERS[index] as readonly number[]
      expect(peers).toHaveLength(20)
      expect(peers).not.toContain(index)
    }
  })

  it('makes peership symmetric', () => {
    for (let index = 0; index < CELLS; index++) {
      for (const peer of PEERS[index] as readonly number[]) {
        expect(PEERS[peer]).toContain(index)
      }
    }
  })
})

describe('parsing', () => {
  const text =
    '53..7....6..195....98....6.8...6...34..8.3..17...2...6.6....28....419..5....8..79'

  it('round-trips a grid through text', () => {
    expect(formatGrid(parseGrid(text))).toBe(text)
  })

  it('accepts zeros and whitespace as empty cells', () => {
    const withZeros = text.replace(/\./g, '0')
    expect(formatGrid(parseGrid(withZeros))).toBe(text)
    expect(formatGrid(parseGrid(`${text.slice(0, 40)}\n ${text.slice(40)}`))).toBe(text)
  })

  it('rejects wrong lengths and bad characters', () => {
    expect(() => parseGrid('123')).toThrow(/Expected 81 cells/)
    expect(() => parseGrid('x'.repeat(81))).toThrow(/Invalid character/)
  })

  it('counts clues', () => {
    expect(countClues(parseGrid(text))).toBe(30)
  })
})

describe('candidatesFrom', () => {
  it('leaves an empty grid fully open', () => {
    const candidates = candidatesFrom(new Uint8Array(CELLS))
    for (const mask of candidates) expect(mask).toBe(ALL_DIGITS_MASK)
  })

  it('locks a filled cell to its digit and strips it from peers', () => {
    const values = new Uint8Array(CELLS)
    values[0] = 5
    const candidates = candidatesFrom(values)

    expect(candidates[0]).toBe(bitFor(5))
    for (const peer of PEERS[0] as readonly number[]) {
      expect((candidates[peer] as number) & bitFor(5)).toBe(0)
    }
    expect((candidates[80] as number) & bitFor(5)).not.toBe(0)
  })
})
