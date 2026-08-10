import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
} from 'react'
import { useTimer } from '../hooks/useTimer'
import { appendRecord, type GameOutcome, type GameRecord } from '../lib/stats'
import { clearGame, loadGame, loadHistory, saveGame, saveHistory } from '../lib/storage'
import type { Difficulty } from '../lib/types'
import type { GenerateRequest, GenerateResponse } from '../workers/generator.worker'
import { gameReducer, initialGameState, type GameAction, type GameState } from './gameReducer'
import { fromSavedGame, toSavedGame } from './persistence'

const SAVE_DEBOUNCE_MS = 400
const SAVE_INTERVAL_MS = 5_000

interface GameValue {
  readonly state: GameState
  readonly dispatch: Dispatch<GameAction>
  readonly difficulty: Difficulty
  readonly error: string | null
  readonly elapsedMs: number
  readonly history: readonly GameRecord[]
  readonly newGame: (difficulty: Difficulty) => void
  readonly restart: () => void
}

const GameContext = createContext<GameValue | null>(null)

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, undefined, initialGameState)
  const [difficulty, setDifficulty] = useState<Difficulty>('easy')
  const [error, setError] = useState<string | null>(null)
  // The PRD starts the clock at first input, not when the puzzle appears.
  const [started, setStarted] = useState(false)
  const [history, setHistory] = useState<readonly GameRecord[]>(loadHistory)

  const workerRef = useRef<Worker | null>(null)
  const { elapsedMs, reset: resetTimer } = useTimer(started && state.status === 'playing')

  // Callbacks below must stay stable, so they read the current game from here
  // rather than closing over it.
  const latest = useRef({ state, difficulty, elapsedMs, started })
  useEffect(() => {
    latest.current = { state, difficulty, elapsedMs, started }
  })

  useEffect(() => {
    const worker = new Worker(new URL('../workers/generator.worker.ts', import.meta.url), {
      type: 'module',
    })

    worker.onmessage = (event: MessageEvent<GenerateResponse>) => {
      if (event.data.ok) {
        setError(null)
        dispatch({ type: 'loadPuzzle', puzzle: event.data.puzzle })
      } else {
        setError(event.data.message)
      }
    }

    workerRef.current = worker
    return () => {
      worker.terminate()
      workerRef.current = null
    }
  }, [])

  // Latches on the first edit and stays on, so undoing back to an empty board
  // does not stop the clock.
  useEffect(() => {
    if (state.past.length > 0) setStarted(true)
  }, [state.past.length])

  const saveNow = useCallback(() => {
    const current = latest.current
    const saved = toSavedGame(current.state, current.difficulty, current.elapsedMs)
    if (saved) saveGame(saved)
  }, [])

  const recordGame = useCallback((outcome: GameOutcome) => {
    const current = latest.current
    if (!current.state.puzzle) return

    const record: GameRecord = {
      difficulty: current.difficulty,
      durationMs: current.elapsedMs,
      assisted: current.state.hintsUsed > 0,
      outcome,
      finishedAt: Date.now(),
    }

    setHistory((entries) => {
      const next = appendRecord(entries, record)
      saveHistory(next)
      return next
    })
  }, [])

  const newGame = useCallback(
    (next: Difficulty) => {
      const current = latest.current
      const inProgress = current.state.status === 'playing' || current.state.status === 'paused'
      if (inProgress && current.started) recordGame('abandoned')

      clearGame()
      setDifficulty(next)
      setError(null)
      setStarted(false)
      resetTimer(0)
      dispatch({ type: 'startGenerating' })

      const request: GenerateRequest = { difficulty: next }
      workerRef.current?.postMessage(request)
    },
    [recordGame, resetTimer],
  )

  const restart = useCallback(() => {
    setStarted(false)
    resetTimer(0)
    dispatch({ type: 'restart' })
  }, [resetTimer])

  // Resume a saved game if there is one; otherwise open with an easy puzzle.
  useEffect(() => {
    const saved = loadGame()
    if (!saved) {
      newGame('easy')
      return
    }

    const restored = fromSavedGame(saved)
    setDifficulty(restored.difficulty)
    resetTimer(restored.elapsedMs)
    setStarted(restored.elapsedMs > 0)
    dispatch({ type: 'restore', state: restored.state })
  }, [newGame, resetTimer])

  const finishedRef = useRef(false)
  useEffect(() => {
    if (state.status !== 'complete') {
      finishedRef.current = false
      return
    }
    if (finishedRef.current) return

    finishedRef.current = true
    recordGame(state.revealed ? 'abandoned' : 'completed')
    clearGame()
  }, [state.status, state.revealed, recordGame])

  // Save shortly after each change...
  useEffect(() => {
    if (state.status !== 'playing' && state.status !== 'paused') return
    const id = setTimeout(saveNow, SAVE_DEBOUNCE_MS)
    return () => clearTimeout(id)
  }, [state, difficulty, saveNow])

  // ...and on a slow tick, so a long think is not lost from the timer.
  useEffect(() => {
    if (state.status !== 'playing') return
    const id = setInterval(saveNow, SAVE_INTERVAL_MS)
    return () => clearInterval(id)
  }, [state.status, saveNow])

  // Closing or backgrounding the tab is the most likely way to leave mid-game.
  useEffect(() => {
    const onHide = () => saveNow()
    window.addEventListener('pagehide', onHide)
    document.addEventListener('visibilitychange', onHide)
    return () => {
      window.removeEventListener('pagehide', onHide)
      document.removeEventListener('visibilitychange', onHide)
    }
  }, [saveNow])

  const value = useMemo(
    () => ({ state, dispatch, difficulty, error, elapsedMs, history, newGame, restart }),
    [state, difficulty, error, elapsedMs, history, newGame, restart],
  )

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>
}

export function useGame(): GameValue {
  const value = useContext(GameContext)
  if (!value) throw new Error('useGame must be used inside a GameProvider')
  return value
}
