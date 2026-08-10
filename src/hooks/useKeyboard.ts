import { useEffect } from 'react'
import { useGame } from '../state/GameContext'
import { useSettings } from '../state/SettingsContext'

const ARROWS: Readonly<Record<string, { rows: number; cols: number }>> = {
  ArrowUp: { rows: -1, cols: 0 },
  ArrowDown: { rows: 1, cols: 0 },
  ArrowLeft: { rows: 0, cols: -1 },
  ArrowRight: { rows: 0, cols: 1 },
}

/** Whether the event came from a text field, where digits should type normally. */
function isTypingElsewhere(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
}

export function useKeyboard(): void {
  const { dispatch } = useGame()
  const { autoClearNotes } = useSettings()

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (isTypingElsewhere(event.target) || event.altKey) return

      const undoCombo = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z'
      if (undoCombo) {
        event.preventDefault()
        dispatch({ type: event.shiftKey ? 'redo' : 'undo' })
        return
      }
      if (event.ctrlKey || event.metaKey) return

      // Shift+digit enters a candidate without leaving digit mode. Reading event.code
      // matters here: shifted number keys produce punctuation in event.key.
      const digitFromCode = /^Digit([1-9])$/.exec(event.code)?.[1]
      if (event.shiftKey && digitFromCode) {
        event.preventDefault()
        dispatch({
          type: 'setDigit',
          digit: Number(digitFromCode),
          autoClearNotes,
          asNote: true,
        })
        return
      }

      if (event.key >= '1' && event.key <= '9') {
        event.preventDefault()
        dispatch({ type: 'setDigit', digit: Number(event.key), autoClearNotes })
        return
      }

      const arrow = ARROWS[event.key]
      if (arrow) {
        event.preventDefault()
        dispatch({ type: 'move', rows: arrow.rows, cols: arrow.cols })
        return
      }

      if (event.key === 'Backspace' || event.key === 'Delete' || event.key === '0') {
        event.preventDefault()
        dispatch({ type: 'clearCell' })
        return
      }

      if (event.key.toLowerCase() === 'n') {
        event.preventDefault()
        dispatch({ type: 'toggleNotesMode' })
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [dispatch, autoClearNotes])
}
