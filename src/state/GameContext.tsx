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
import type { Difficulty } from '../lib/types'
import type { GenerateRequest, GenerateResponse } from '../workers/generator.worker'
import { gameReducer, initialGameState, type GameAction, type GameState } from './gameReducer'

interface GameValue {
  readonly state: GameState
  readonly dispatch: Dispatch<GameAction>
  readonly difficulty: Difficulty
  readonly error: string | null
  readonly newGame: (difficulty: Difficulty) => void
}

const GameContext = createContext<GameValue | null>(null)

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, undefined, initialGameState)
  const [difficulty, setDifficulty] = useState<Difficulty>('easy')
  const [error, setError] = useState<string | null>(null)
  const workerRef = useRef<Worker | null>(null)

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

  const newGame = useCallback((next: Difficulty) => {
    setDifficulty(next)
    setError(null)
    dispatch({ type: 'startGenerating' })

    const request: GenerateRequest = { difficulty: next }
    workerRef.current?.postMessage(request)
  }, [])

  // The worker effect above runs first, so it is ready by the time this fires.
  useEffect(() => {
    newGame('easy')
  }, [newGame])

  const value = useMemo(
    () => ({ state, dispatch, difficulty, error, newGame }),
    [state, difficulty, error, newGame],
  )

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>
}

export function useGame(): GameValue {
  const value = useContext(GameContext)
  if (!value) throw new Error('useGame must be used inside a GameProvider')
  return value
}
