import { useCallback, useEffect, useState } from 'react'

export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'sudoku.theme'

function readStoredTheme(): Theme | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored === 'light' || stored === 'dark' ? stored : null
  } catch {
    return null
  }
}

function systemTheme(): Theme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/**
 * Resolves the active theme from an explicit choice, falling back to the OS preference.
 * Until the user toggles, no data-theme attribute is set, so CSS handles it alone.
 */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => readStoredTheme() ?? systemTheme())
  const [followsSystem, setFollowsSystem] = useState(() => readStoredTheme() === null)

  useEffect(() => {
    if (followsSystem) {
      document.documentElement.removeAttribute('data-theme')
    } else {
      document.documentElement.setAttribute('data-theme', theme)
    }
  }, [theme, followsSystem])

  useEffect(() => {
    if (!followsSystem) return
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const sync = () => setTheme(media.matches ? 'dark' : 'light')
    media.addEventListener('change', sync)
    return () => media.removeEventListener('change', sync)
  }, [followsSystem])

  const toggle = useCallback(() => {
    setTheme((current) => {
      const next: Theme = current === 'dark' ? 'light' : 'dark'
      try {
        localStorage.setItem(STORAGE_KEY, next)
      } catch {
        // Private mode - the choice just won't survive a reload.
      }
      return next
    })
    setFollowsSystem(false)
  }, [])

  return { theme, toggle }
}
