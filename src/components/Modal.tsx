import { useEffect, useRef, type ReactNode } from 'react'
import './Modal.css'

interface ModalProps {
  readonly title: string
  readonly children: ReactNode
  readonly onClose?: () => void
}

export function Modal({ title, children, onClose }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null)

  // Move focus into the dialog so it is announced and Escape reaches it.
  useEffect(() => {
    dialogRef.current?.focus()
  }, [])

  useEffect(() => {
    if (!onClose) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onClose?.()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <div className="modal-backdrop">
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="modal glass"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <h2 className="modal__title">{title}</h2>
        {children}
      </div>
    </div>
  )
}
