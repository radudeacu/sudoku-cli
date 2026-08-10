import { useCallback, useEffect, useMemo, useRef } from 'react'
import { CELLS, PEERS } from '../../lib/grid'
import { useGame } from '../../state/GameContext'
import { isGiven } from '../../state/gameReducer'
import { Cell } from './Cell'
import './Board.css'

const NO_PEERS: ReadonlySet<number> = new Set()

export function Board() {
  const { state, dispatch, error } = useGame()

  const select = useCallback(
    (index: number) => dispatch({ type: 'select', index }),
    [dispatch],
  )

  const peers = useMemo(
    () => (state.selected === null ? NO_PEERS : new Set(PEERS[state.selected] as readonly number[])),
    [state.selected],
  )

  const incorrect = useMemo(() => new Set(state.incorrect), [state.incorrect])
  const selectedValue = state.selected === null ? 0 : (state.values[state.selected] as number)

  // Keep DOM focus on the selected cell, but only once focus is already inside the
  // grid - otherwise arrowing around would yank focus away from a button.
  const gridRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const grid = gridRef.current
    if (!grid || state.selected === null) return
    if (!grid.contains(document.activeElement)) return

    const cell = grid.children[state.selected]
    if (cell instanceof HTMLElement) cell.focus()
  }, [state.selected])

  if (error) {
    return (
      <div className="board-panel glass">
        <p className="board-panel__message board-panel__message--error" role="alert">
          {error}
        </p>
      </div>
    )
  }

  if (state.status === 'generating' || !state.puzzle) {
    return (
      <div className="board-panel glass">
        <p className="board-panel__message" role="status">
          Generating a puzzle…
        </p>
      </div>
    )
  }

  return (
    <div className="board-panel glass">
      <div
        ref={gridRef}
        role="grid"
        aria-label="Sudoku grid"
        className={`board${state.status === 'paused' ? ' board--paused' : ''}`}
        // `inert` removes it from focus and the accessibility tree together, which
        // aria-hidden alone would not do while a cell still holds focus.
        inert={state.status === 'paused'}
      >
        {Array.from({ length: CELLS }, (_, index) => {
          const value = state.values[index] as number
          return (
            <Cell
              key={index}
              index={index}
              value={value}
              notes={state.notes[index] as number}
              given={isGiven(state, index)}
              selected={state.selected === index}
              peer={peers.has(index)}
              matching={selectedValue !== 0 && value === selectedValue && state.selected !== index}
              incorrect={incorrect.has(index)}
              // With nothing selected the first cell holds the tab stop, so the
              // grid is still reachable by keyboard.
              focusable={state.selected === null ? index === 0 : state.selected === index}
              onSelect={select}
            />
          )
        })}
      </div>

      {state.status === 'paused' && (
        <p className="board-panel__paused" role="status">
          Paused
        </p>
      )}
    </div>
  )
}
