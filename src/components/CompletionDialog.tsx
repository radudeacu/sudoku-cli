import { useEffect, useState } from 'react'
import { formatDuration } from '../hooks/useTimer'
import { statsFor } from '../lib/stats'
import { useGame } from '../state/GameContext'
import { Modal } from './Modal'

export function CompletionDialog() {
  const { state, difficulty, elapsedMs, history, newGame } = useGame()
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (state.status !== 'complete') setDismissed(false)
  }, [state.status])

  if (state.status !== 'complete' || dismissed) return null

  const revealed = state.revealed
  const assisted = state.hintsUsed > 0
  const stats = statsFor(history, difficulty)

  return (
    <Modal
      title={revealed ? 'Solution revealed' : 'Solved'}
      onClose={() => setDismissed(true)}
    >
      {revealed ? (
        <p className="modal__text">
          This one does not count towards your stats. No shame in it — some grids
          deserve it.
        </p>
      ) : (
        <>
          <p className="modal__text">
            {difficulty} in <strong>{formatDuration(elapsedMs)}</strong>
            {state.mistakes > 0 ? ` with ${state.mistakes} mistake${state.mistakes === 1 ? '' : 's'}` : ''}
            .
          </p>
          {assisted && (
            <p className="modal__text">
              You used {state.hintsUsed} hint{state.hintsUsed === 1 ? '' : 's'}, so this
              one is not counted in your best time.
            </p>
          )}
          {stats.bestTimeMs !== null && (
            <p className="modal__text">
              Best {difficulty}: {formatDuration(stats.bestTimeMs)} · streak{' '}
              {stats.currentStreak}
            </p>
          )}
        </>
      )}

      <div className="modal__actions">
        <button type="button" className="button button--primary" onClick={() => newGame(difficulty)}>
          New {difficulty}
        </button>
        <button type="button" className="button" onClick={() => setDismissed(true)}>
          Close
        </button>
      </div>
    </Modal>
  )
}
