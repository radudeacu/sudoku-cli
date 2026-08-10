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
import type { Difficulty } from '../lib/types'
import type { GenerateRequest, GenerateResponse } from '../workers/generator.worker'
import { gameReducer, initialGameState, type GameAction, type GameState } from './gameReducer'

interface GameValue {
  readonly state: GameState
  readonly dispatch: Dispatch<GameAction>
  readonly difficulty: Difficulty
  readonly error: string | null
  readonly elapsedMs: number
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
  const workerRef = useRef<Worker | null>(null)

  const { elapsedMs, reset: resetTimer } = useTimer(started && state.status === 'playing')

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

  const newGame = useCallback(
    (next: Difficulty) => {
      setDifficulty(next)
      setError(null)
      setStarted(false)
      resetTimer(0)
      dispatch({ type: 'startGenerating' })

      const request: GenerateRequest = { difficulty: next }
      workerRef.current?.postMessage(request)
    },
    [resetTimer],
  )

  const restart = useCallback(() => {
    setStarted(false)
    resetTimer(0)
    dispatch({ type: 'restart' })
  }, [resetTimer])

  // The worker effect above runs first, so it is ready by the time this fires.
  useEffect(() => {
    newGame('easy')
  }, [newGame])

  const value = useMemo(
    () => ({ state, dispatch, difficulty, error, elapsedMs, newGame, restart }),
    [state, difficulty, error, elapsedMs, newGame, restart],
  )

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>
}

export function useGame(): GameValue {
  const value = useContext(GameContext)
  if (!value) throw new Error('useGame must be used inside a GameProvider')
  return value
}
