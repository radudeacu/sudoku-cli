import { Board } from './components/Board/Board'
import { useKeyboard } from './hooks/useKeyboard'
import { GameProvider } from './state/GameContext'
import { SettingsProvider, useSettings } from './state/SettingsContext'
import './App.css'

function GameScreen() {
  const { theme, toggleTheme } = useSettings()
  useKeyboard()

  return (
    <div className="app">
      <header className="app__header glass">
        <h1 className="app__title">Sudoku</h1>
        <button
          type="button"
          className="app__theme-toggle"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
        >
          {theme === 'dark' ? '☾' : '☀'}
        </button>
      </header>

      <Board />
    </div>
  )
}

export function App() {
  return (
    <SettingsProvider>
      <GameProvider>
        <GameScreen />
      </GameProvider>
    </SettingsProvider>
  )
}
