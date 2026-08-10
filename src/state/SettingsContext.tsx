import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { useTheme, type Theme } from '../hooks/useTheme'
import { loadPlayerName, savePlayerName } from '../lib/storage'

const AUTO_CLEAR_KEY = 'sudoku.autoClearNotes'

export const DEFAULT_PLAYER_NAME = 'Player'

interface SettingsValue {
  readonly theme: Theme
  readonly toggleTheme: () => void
  readonly autoClearNotes: boolean
  readonly toggleAutoClearNotes: () => void
  /** Null until the player has been asked, which is what triggers the prompt. */
  readonly playerName: string | null
  readonly setPlayerName: (name: string) => void
}

const SettingsContext = createContext<SettingsValue | null>(null)

function readAutoClear(): boolean {
  try {
    // Defaults to on, so only an explicit "false" turns it off.
    return localStorage.getItem(AUTO_CLEAR_KEY) !== 'false'
  } catch {
    return true
  }
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { theme, toggle: toggleTheme } = useTheme()
  const [autoClearNotes, setAutoClearNotes] = useState(readAutoClear)
  const [playerName, setStoredName] = useState<string | null>(loadPlayerName)

  const toggleAutoClearNotes = useCallback(() => {
    setAutoClearNotes((current) => {
      const next = !current
      try {
        localStorage.setItem(AUTO_CLEAR_KEY, String(next))
      } catch {
        // Private mode - the preference just won't survive a reload.
      }
      return next
    })
  }, [])

  const setPlayerName = useCallback((name: string) => {
    const trimmed = name.trim() === '' ? DEFAULT_PLAYER_NAME : name.trim()
    savePlayerName(trimmed)
    setStoredName(trimmed)
  }, [])

  const value = useMemo(
    () => ({
      theme,
      toggleTheme,
      autoClearNotes,
      toggleAutoClearNotes,
      playerName,
      setPlayerName,
    }),
    [theme, toggleTheme, autoClearNotes, toggleAutoClearNotes, playerName, setPlayerName],
  )

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

export function useSettings(): SettingsValue {
  const value = useContext(SettingsContext)
  if (!value) throw new Error('useSettings must be used inside a SettingsProvider')
  return value
}
