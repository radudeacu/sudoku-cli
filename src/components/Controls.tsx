import { useState } from 'react'
import { DIFFICULTIES, type Difficulty } from '../lib/types'
import { useGame } from '../state/GameContext'
import './Controls.css'

export function Controls() {
  const { state, dispatch, newGame, restart, difficulty } = useGame()
  const [pending, setPending] = useState<Difficulty>(difficulty)

  const playing = state.status === 'playing'
  const hasPuzzle = state.puzzle !== null

  function confirmSolve() {
    // Revealing the answer ends the game and forfeits the stats, so make it deliberate.
    if (window.confirm('Reveal the whole solution? This ends the game.')) {
      dispatch({ type: 'revealSolution' })
    }
  }

  return (
    <section className="controls" aria-label="Game controls">
      <div className="controls__row">
        <button
          type="button"
          className="button button--primary"
          onClick={() => dispatch({ type: 'check' })}
          disabled={!playing}
        >
          Check
        </button>
        <button
          type="button"
          className="button"
          onClick={() => dispatch({ type: 'hint' })}
          disabled={!playing}
        >
          Hint
        </button>
        <button
          type="button"
          className="button"
          onClick={() => dispatch({ type: 'undo' })}
          disabled={state.past.length === 0}
        >
          Undo
        </button>
        <button
          type="button"
          className="button"
          onClick={() => dispatch({ type: 'redo' })}
          disabled={state.future.length === 0}
        >
          Redo
        </button>
      </div>

      <div className="controls__row">
        <label className="controls__difficulty">
          <span className="visually-hidden">Difficulty</span>
          <select
            value={pending}
            onChange={(event) => setPending(event.target.value as Difficulty)}
          >
            {DIFFICULTIES.map((level) => (
              <option key={level} value={level}>
                {level[0]?.toUpperCase()}
                {level.slice(1)}
              </option>
            ))}
          </select>
        </label>

        <button type="button" className="button" onClick={() => newGame(pending)}>
          New game
        </button>
        <button type="button" className="button" onClick={restart} disabled={!hasPuzzle}>
          Restart
        </button>
        <button type="button" className="button" onClick={confirmSolve} disabled={!playing}>
          Solve
        </button>
      </div>
    </section>
  )
}
