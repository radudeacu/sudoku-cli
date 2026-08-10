import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { useTheme, type Theme } from '../hooks/useTheme'

const AUTO_CLEAR_KEY = 'sudoku.autoClearNotes'

interface SettingsValue {
  readonly theme: Theme
  readonly toggleTheme: () => void
  readonly autoClearNotes: boolean
  readonly toggleAutoClearNotes: () => void
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

  const value = useMemo(
    () => ({ theme, toggleTheme, autoClearNotes, toggleAutoClearNotes }),
    [theme, toggleTheme, autoClearNotes, toggleAutoClearNotes],
  )

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

export function useSettings(): SettingsValue {
  const value = useContext(SettingsContext)
  if (!value) throw new Error('useSettings must be used inside a SettingsProvider')
  return value
}
