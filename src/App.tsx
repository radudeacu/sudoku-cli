import { Board } from './components/Board/Board'
import { Controls } from './components/Controls'
import { Header } from './components/Header'
import { NumberPad } from './components/NumberPad'
import { useKeyboard } from './hooks/useKeyboard'
import { GameProvider } from './state/GameContext'
import { SettingsProvider } from './state/SettingsContext'
import './App.css'

function GameScreen() {
  useKeyboard()

  return (
    <div className="app">
      <Header />
      <Board />
      <NumberPad />
      <Controls />
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
