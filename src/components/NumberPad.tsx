import { CELLS, SIZE } from '../lib/grid'
import { useGame } from '../state/GameContext'
import { useSettings } from '../state/SettingsContext'
import './NumberPad.css'

/** How many of each digit are still missing from the board. */
function remainingCounts(values: Uint8Array): number[] {
  const placed = new Array<number>(SIZE + 1).fill(0)
  for (let index = 0; index < CELLS; index++) {
    placed[values[index] as number] = (placed[values[index] as number] as number) + 1
  }
  return Array.from({ length: SIZE }, (_, offset) => SIZE - (placed[offset + 1] as number))
}

export function NumberPad() {
  const { state, dispatch } = useGame()
  const { autoClearNotes } = useSettings()

  const playing = state.status === 'playing'
  const remaining = remainingCounts(state.values)

  return (
    <section className="pad" aria-label="Number pad">
      <div className="pad__digits">
        {Array.from({ length: SIZE }, (_, offset) => {
          const digit = offset + 1
          const left = remaining[offset] as number
          return (
            <button
              key={digit}
              type="button"
              className="pad__digit"
              onClick={() => dispatch({ type: 'setDigit', digit, autoClearNotes })}
              disabled={!playing || left === 0}
              aria-label={`${digit}, ${left} remaining`}
            >
              <span className="pad__digit-value">{digit}</span>
              <span className="pad__digit-left" aria-hidden="true">
                {left}
              </span>
            </button>
          )
        })}
      </div>

      <div className="pad__modes">
        <button
          type="button"
          className={`button${state.notesMode ? ' button--active' : ''}`}
          onClick={() => dispatch({ type: 'toggleNotesMode' })}
          aria-pressed={state.notesMode}
          disabled={!playing}
        >
          Notes
        </button>
        <button
          type="button"
          className="button"
          onClick={() => dispatch({ type: 'clearCell' })}
          disabled={!playing}
        >
          Erase
        </button>
      </div>
    </section>
  )
}
