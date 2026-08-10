import { useTheme } from './hooks/useTheme'
import './App.css'

export function App() {
  const { theme, toggle } = useTheme()

  return (
    <div className="app">
      <header className="app__header glass">
        <h1 className="app__title">Sudoku</h1>
        <button
          type="button"
          className="app__theme-toggle"
          onClick={toggle}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
        >
          {theme === 'dark' ? '☾' : '☀'}
        </button>
      </header>

      <main className="app__panel glass">
        <p className="app__placeholder">Puzzle engine lands next.</p>
      </main>
    </div>
  )
}
