import { formatDuration } from '../hooks/useTimer'
import { statsFor } from '../lib/stats'
import { DIFFICULTIES } from '../lib/types'
import { useGame } from '../state/GameContext'
import { DEFAULT_PLAYER_NAME, useSettings } from '../state/SettingsContext'
import { Modal } from './Modal'
import './StatsPanel.css'

export function StatsPanel({ onClose }: { onClose: () => void }) {
  const { history } = useGame()
  const { playerName } = useSettings()

  return (
    <Modal title={`${playerName ?? DEFAULT_PLAYER_NAME}'s stats`} onClose={onClose}>
      <div className="stats__scroll">
        <table className="stats">
          <thead>
            <tr>
              <th scope="col">Level</th>
              <th scope="col">Done</th>
              <th scope="col">Best</th>
              <th scope="col">Average</th>
              <th scope="col">Streak</th>
              <th scope="col">Longest</th>
            </tr>
          </thead>
          <tbody>
            {DIFFICULTIES.map((difficulty) => {
              const stats = statsFor(history, difficulty)
              return (
                <tr key={difficulty}>
                  <th scope="row">{difficulty}</th>
                  <td>{stats.completed}</td>
                  <td>{stats.bestTimeMs === null ? '—' : formatDuration(stats.bestTimeMs)}</td>
                  <td>
                    {stats.averageTimeMs === null ? '—' : formatDuration(stats.averageTimeMs)}
                  </td>
                  <td>{stats.currentStreak}</td>
                  <td>{stats.longestStreak}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <p className="modal__text stats__note">
        Times exclude games where a hint was used. Stored in this browser only — they
        do not follow you to another device.
      </p>

      <div className="modal__actions">
        <button type="button" className="button button--primary" onClick={onClose}>
          Close
        </button>
      </div>
    </Modal>
  )
}
