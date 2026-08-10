import { useCallback, useMemo } from 'react'
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
        role="grid"
        aria-label="Sudoku grid"
        className={`board${state.status === 'paused' ? ' board--paused' : ''}`}
        // Hidden from assistive tech while paused for the same reason it is blurred.
        aria-hidden={state.status === 'paused'}
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
