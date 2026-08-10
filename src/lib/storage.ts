import { CELLS } from './grid'
import type { GameOutcome, GameRecord } from './stats'
import { DIFFICULTIES, TECHNIQUES, type Difficulty, type Technique } from './types'

/** Bump when the saved shape changes; older payloads are discarded rather than migrated. */
export const SCHEMA_VERSION = 1

const GAME_KEY = 'sudoku.game'
const HISTORY_KEY = 'sudoku.history'
const NAME_KEY = 'sudoku.playerName'

/** Grids travel as 81-character strings; notes as one mask per cell. */
export interface SavedGame {
  readonly version: number
  readonly difficulty: Difficulty
  readonly givens: string
  readonly solution: string
  readonly values: string
  readonly notes: readonly number[]
  readonly clueCount: number
  readonly hardestTechnique: Technique
  readonly selected: number | null
  readonly notesMode: boolean
  readonly mistakes: number
  readonly hintsUsed: number
  readonly elapsedMs: number
  readonly paused: boolean
}

function readJson(key: string): unknown {
  try {
    const raw = localStorage.getItem(key)
    return raw === null ? null : JSON.parse(raw)
  } catch {
    // Unreadable or malformed - treated the same as absent, per the PRD.
    return null
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Storage full or unavailable; the game simply will not resume.
  }
}

function remove(key: string): void {
  try {
    localStorage.removeItem(key)
  } catch {
    // Nothing useful to do.
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isGridString(value: unknown): value is string {
  return typeof value === 'string' && value.length === CELLS && /^[.1-9]{81}$/.test(value)
}

function isDifficulty(value: unknown): value is Difficulty {
  return typeof value === 'string' && (DIFFICULTIES as readonly string[]).includes(value)
}

function isTechnique(value: unknown): value is Technique {
  return typeof value === 'string' && (TECHNIQUES as readonly string[]).includes(value)
}

function isNoteArray(value: unknown): value is number[] {
  return (
    Array.isArray(value) &&
    value.length === CELLS &&
    value.every((mask) => Number.isInteger(mask) && mask >= 0 && mask <= 0b1_1111_1111)
  )
}

function isCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

function isSavedGame(value: unknown): value is SavedGame {
  if (!isRecord(value)) return false
  if (value.version !== SCHEMA_VERSION) return false

  const selectedOk =
    value.selected === null ||
    (Number.isInteger(value.selected) &&
      (value.selected as number) >= 0 &&
      (value.selected as number) < CELLS)

  return (
    isDifficulty(value.difficulty) &&
    isGridString(value.givens) &&
    isGridString(value.solution) &&
    isGridString(value.values) &&
    isNoteArray(value.notes) &&
    isCount(value.clueCount) &&
    isTechnique(value.hardestTechnique) &&
    selectedOk &&
    typeof value.notesMode === 'boolean' &&
    isCount(value.mistakes) &&
    isCount(value.hintsUsed) &&
    isCount(value.elapsedMs) &&
    typeof value.paused === 'boolean'
  )
}

export function saveGame(game: SavedGame): void {
  writeJson(GAME_KEY, game)
}

/** Returns null for absent, unparseable, out-of-date, or structurally invalid saves. */
export function loadGame(): SavedGame | null {
  const value = readJson(GAME_KEY)
  return isSavedGame(value) ? value : null
}

export function clearGame(): void {
  remove(GAME_KEY)
}

const OUTCOMES: readonly GameOutcome[] = ['completed', 'abandoned']

function isGameRecord(value: unknown): value is GameRecord {
  if (!isRecord(value)) return false
  return (
    isDifficulty(value.difficulty) &&
    isCount(value.durationMs) &&
    typeof value.assisted === 'boolean' &&
    typeof value.outcome === 'string' &&
    (OUTCOMES as readonly string[]).includes(value.outcome) &&
    isCount(value.finishedAt)
  )
}

export function saveHistory(history: readonly GameRecord[]): void {
  writeJson(HISTORY_KEY, history)
}

/** Drops individual malformed entries rather than the whole history. */
export function loadHistory(): GameRecord[] {
  const value = readJson(HISTORY_KEY)
  if (!Array.isArray(value)) return []
  return value.filter(isGameRecord)
}

export function savePlayerName(name: string): void {
  writeJson(NAME_KEY, name)
}

export function loadPlayerName(): string | null {
  const value = readJson(NAME_KEY)
  return typeof value === 'string' && value.trim().length > 0 ? value : null
}
