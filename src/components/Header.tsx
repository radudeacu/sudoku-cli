import { formatDuration } from '../hooks/useTimer'
import { useGame } from '../state/GameContext'
import { useSettings } from '../state/SettingsContext'
import './Header.css'

export function Header() {
  const { state, dispatch, elapsedMs, difficulty } = useGame()
  const { theme, toggleTheme } = useSettings()

  const paused = state.status === 'paused'
  const canPause = paused || state.status === 'playing'

  return (
    <header className="header glass">
      <div className="header__meta">
        <h1 className="header__title">Sudoku</h1>
        <span className="header__difficulty">{difficulty}</span>
      </div>

      <div className="header__stats">
        <span className="header__mistakes" title="Mistakes found by Check">
          {state.mistakes} ✕
        </span>
        <span className="header__timer" aria-label={`Elapsed time ${formatDuration(elapsedMs)}`}>
          {formatDuration(elapsedMs)}
        </span>
      </div>

      <div className="header__actions">
        <button
          type="button"
          className="icon-button"
          onClick={() => dispatch({ type: paused ? 'resume' : 'pause' })}
          disabled={!canPause}
          aria-label={paused ? 'Resume' : 'Pause'}
        >
          {paused ? '▶' : '❚❚'}
        </button>
        <button
          type="button"
          className="icon-button"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
        >
          {theme === 'dark' ? '☾' : '☀'}
        </button>
      </div>
    </header>
  )
}
