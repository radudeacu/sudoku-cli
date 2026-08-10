import { memo } from 'react'
import { SIZE, bitFor, colOf, rowOf } from '../../lib/grid'

export interface CellProps {
  readonly index: number
  readonly value: number
  readonly notes: number
  readonly given: boolean
  readonly selected: boolean
  /** Shares a row, column, or box with the selection. */
  readonly peer: boolean
  /** Holds the same digit as the selected cell. */
  readonly matching: boolean
  readonly incorrect: boolean
  /** The grid's single tab stop. Exactly one cell carries it. */
  readonly focusable: boolean
  readonly onSelect: (index: number) => void
}

function NoteMarks({ mask }: { mask: number }) {
  return (
    <span className="cell__notes" aria-hidden="true">
      {Array.from({ length: SIZE }, (_, offset) => {
        const digit = offset + 1
        return (
          <span key={digit} className="cell__note">
            {(mask & bitFor(digit)) !== 0 ? digit : ''}
          </span>
        )
      })}
    </span>
  )
}

function describe(index: number, value: number, given: boolean): string {
  const position = `row ${rowOf(index) + 1}, column ${colOf(index) + 1}`
  if (value === 0) return `${position}, empty`
  return `${position}, ${value}${given ? ', given' : ''}`
}

export const Cell = memo(function Cell({
  index,
  value,
  notes,
  given,
  selected,
  peer,
  matching,
  incorrect,
  focusable,
  onSelect,
}: CellProps) {
  const row = rowOf(index)
  const col = colOf(index)

  const classNames = ['cell']
  if (given) classNames.push('cell--given')
  if (selected) classNames.push('cell--selected')
  else if (matching) classNames.push('cell--matching')
  else if (peer) classNames.push('cell--peer')
  if (incorrect) classNames.push('cell--incorrect')
  if (col % 3 === 2 && col !== SIZE - 1) classNames.push('cell--box-right')
  if (row % 3 === 2 && row !== SIZE - 1) classNames.push('cell--box-bottom')

  return (
    <button
      type="button"
      role="gridcell"
      className={classNames.join(' ')}
      // Roving tabindex: one stop for the whole grid, arrows move within it.
      tabIndex={focusable ? 0 : -1}
      aria-label={describe(index, value, given)}
      aria-selected={selected}
      onClick={() => onSelect(index)}
    >
      {value !== 0 ? (
        <span className="cell__digit">{value}</span>
      ) : notes !== 0 ? (
        <NoteMarks mask={notes} />
      ) : null}
    </button>
  )
})
