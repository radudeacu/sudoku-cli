export const SIZE = 9
export const BOX_SIZE = 3
export const CELLS = SIZE * SIZE

/** All nine digits set: 0b111111111. */
export const ALL_DIGITS_MASK = 0b1_1111_1111

export function rowOf(index: number): number {
  return (index / SIZE) | 0
}

export function colOf(index: number): number {
  return index % SIZE
}

export function boxOf(index: number): number {
  return ((rowOf(index) / BOX_SIZE) | 0) * BOX_SIZE + ((colOf(index) / BOX_SIZE) | 0)
}

export function cellIndex(row: number, col: number): number {
  return row * SIZE + col
}

export function bitFor(digit: number): number {
  return 1 << (digit - 1)
}

export function popcount(mask: number): number {
  let remaining = mask
  let count = 0
  while (remaining !== 0) {
    remaining &= remaining - 1
    count++
  }
  return count
}

/** Lowest digit present in the mask, or 0 when the mask is empty. */
export function firstDigit(mask: number): number {
  if (mask === 0) return 0
  return 32 - Math.clz32(mask & -mask)
}

export function digitsOf(mask: number): number[] {
  const digits: number[] = []
  for (let digit = 1; digit <= SIZE; digit++) {
    if ((mask & bitFor(digit)) !== 0) digits.push(digit)
  }
  return digits
}

function buildRowUnits(): number[][] {
  return Array.from({ length: SIZE }, (_, row) =>
    Array.from({ length: SIZE }, (_, col) => cellIndex(row, col)),
  )
}

function buildColUnits(): number[][] {
  return Array.from({ length: SIZE }, (_, col) =>
    Array.from({ length: SIZE }, (_, row) => cellIndex(row, col)),
  )
}

function buildBoxUnits(): number[][] {
  return Array.from({ length: SIZE }, (_, box) => {
    const originRow = ((box / BOX_SIZE) | 0) * BOX_SIZE
    const originCol = (box % BOX_SIZE) * BOX_SIZE
    const cells: number[] = []
    for (let r = 0; r < BOX_SIZE; r++) {
      for (let c = 0; c < BOX_SIZE; c++) {
        cells.push(cellIndex(originRow + r, originCol + c))
      }
    }
    return cells
  })
}

export const ROW_UNITS: readonly (readonly number[])[] = buildRowUnits()
export const COL_UNITS: readonly (readonly number[])[] = buildColUnits()
export const BOX_UNITS: readonly (readonly number[])[] = buildBoxUnits()

/** All 27 units: 9 rows, then 9 columns, then 9 boxes. */
export const UNITS: readonly (readonly number[])[] = [...ROW_UNITS, ...COL_UNITS, ...BOX_UNITS]

function buildPeers(): readonly (readonly number[])[] {
  return Array.from({ length: CELLS }, (_, index) => {
    const peers = new Set<number>()
    for (const cell of ROW_UNITS[rowOf(index)] as readonly number[]) peers.add(cell)
    for (const cell of COL_UNITS[colOf(index)] as readonly number[]) peers.add(cell)
    for (const cell of BOX_UNITS[boxOf(index)] as readonly number[]) peers.add(cell)
    peers.delete(index)
    return [...peers]
  })
}

/** The 20 cells that constrain each cell. Built once at module load. */
export const PEERS: readonly (readonly number[])[] = buildPeers()

function buildUnitsOfCell(): readonly (readonly (readonly number[])[])[] {
  return Array.from({ length: CELLS }, (_, index) => [
    ROW_UNITS[rowOf(index)] as readonly number[],
    COL_UNITS[colOf(index)] as readonly number[],
    BOX_UNITS[boxOf(index)] as readonly number[],
  ])
}

/** The three units (row, column, box) each cell belongs to. */
export const UNITS_OF_CELL: readonly (readonly (readonly number[])[])[] = buildUnitsOfCell()

/**
 * Candidate masks implied by the filled cells. Purely mechanical - it does not
 * detect contradictions, so callers that care must check for empty masks.
 */
export function candidatesFrom(values: Uint8Array): Uint16Array {
  const candidates = new Uint16Array(CELLS).fill(ALL_DIGITS_MASK)
  for (let index = 0; index < CELLS; index++) {
    const digit = values[index] as number
    if (digit !== 0) candidates[index] = bitFor(digit)
  }
  for (let index = 0; index < CELLS; index++) {
    const digit = values[index] as number
    if (digit === 0) continue
    const without = ~bitFor(digit)
    for (const peer of PEERS[index] as readonly number[]) {
      if (values[peer] === 0) candidates[peer] = (candidates[peer] as number) & without
    }
  }
  return candidates
}

export function cloneGrid(grid: Uint8Array): Uint8Array {
  return Uint8Array.from(grid)
}

export function emptyGrid(): Uint8Array {
  return new Uint8Array(CELLS)
}

/** Parses 81 characters, treating '0', '.', and '-' as empty. */
export function parseGrid(text: string): Uint8Array {
  const cleaned = text.replace(/\s+/g, '')
  if (cleaned.length !== CELLS) {
    throw new Error(`Expected ${CELLS} cells, received ${cleaned.length}`)
  }
  const grid = new Uint8Array(CELLS)
  for (let index = 0; index < CELLS; index++) {
    const char = cleaned[index] as string
    if (char === '0' || char === '.' || char === '-') continue
    const digit = Number(char)
    if (!Number.isInteger(digit) || digit < 1 || digit > SIZE) {
      throw new Error(`Invalid character '${char}' at position ${index}`)
    }
    grid[index] = digit
  }
  return grid
}

export function formatGrid(grid: Uint8Array): string {
  return Array.from(grid, (digit) => (digit === 0 ? '.' : String(digit))).join('')
}

export function countClues(grid: Uint8Array): number {
  let clues = 0
  for (let i = 0; i < CELLS; i++) {
    if (grid[i] !== 0) clues++
  }
  return clues
}
