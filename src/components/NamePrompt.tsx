import { useState } from 'react'
import { DEFAULT_PLAYER_NAME, useSettings } from '../state/SettingsContext'
import { Modal } from './Modal'

export function NamePrompt() {
  const { playerName, setPlayerName } = useSettings()
  const [draft, setDraft] = useState('')

  if (playerName !== null) return null

  return (
    <Modal title="What should we call you?">
      <p className="modal__text">
        Only used to label your stats, and only stored in this browser. Skip it and you
        will be {DEFAULT_PLAYER_NAME}.
      </p>

      <form
        onSubmit={(event) => {
          event.preventDefault()
          setPlayerName(draft)
        }}
      >
        <label className="visually-hidden" htmlFor="player-name">
          Display name
        </label>
        <input
          id="player-name"
          className="text-input"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          maxLength={24}
          autoComplete="off"
          placeholder={DEFAULT_PLAYER_NAME}
        />

        <div className="modal__actions">
          <button type="submit" className="button button--primary">
            Save
          </button>
          <button
            type="button"
            className="button"
            onClick={() => setPlayerName(DEFAULT_PLAYER_NAME)}
          >
            Skip
          </button>
        </div>
      </form>
    </Modal>
  )
}
