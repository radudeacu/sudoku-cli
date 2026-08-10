import { useState } from 'react'
import { Board } from './components/Board/Board'
import { CompletionDialog } from './components/CompletionDialog'
import { Controls } from './components/Controls'
import { Header } from './components/Header'
import { NamePrompt } from './components/NamePrompt'
import { NumberPad } from './components/NumberPad'
import { StatsPanel } from './components/StatsPanel'
import { useKeyboard } from './hooks/useKeyboard'
import { GameProvider } from './state/GameContext'
import { SettingsProvider } from './state/SettingsContext'
import './App.css'

function GameScreen() {
  const [showStats, setShowStats] = useState(false)
  useKeyboard()

  return (
    <div className="app">
      <Header onShowStats={() => setShowStats(true)} />
      <Board />
      <NumberPad />
      <Controls />

      <NamePrompt />
      <CompletionDialog />
      {showStats && <StatsPanel onClose={() => setShowStats(false)} />}
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
