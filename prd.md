# PRD: Sudoku Web App

## Goal
A client-side Sudoku web app where a player generates a puzzle at one of four difficulties, solves it with keyboard or touch input, and tracks their times and streaks locally. No accounts, no server — everything runs in the browser.

## Features

### Grid & input
- 9×9 grid with visually distinct 3×3 box separators.
- Given clues are visually distinct from player entries and cannot be edited.
- Select a cell by click or tap; type `1`–`9` to fill it.
- `Delete` / `Backspace` clears the selected cell.
- Arrow keys move the selection one cell in that direction.
- Notes mode holds up to 9 candidate digits per cell, rendered small within the cell.
- Notes mode toggles with `N`, or by holding `Shift` while typing a digit.
- Placing a digit auto-removes that candidate from notes in the same row, column, and box.
- Auto-remove notes is a user setting, default **on**.
- Selecting a cell tints its row, column, and 3×3 box.
- Selecting a cell containing a digit outlines every other cell holding that same digit.
- Undo/redo is unlimited and covers both digit entries and note changes.
- Undo is `Ctrl+Z`; redo is `Ctrl+Shift+Z`.

### Puzzle generation
- Puzzles are generated in-browser; every puzzle has exactly one solution.
- Every puzzle is solvable by logic alone — no guessing required.
- Four difficulty tiers by clue count and required technique:

| Tier | Givens | Hardest technique required |
|---|---|---|
| Easy | 40–45 | Naked singles |
| Medium | 32–39 | Hidden singles, naked pairs |
| Hard | 28–31 | Pointing pairs, box/line reduction |
| Expert | 22–27 | X-wing and beyond |

### Validation
- Nothing is flagged while typing — an incorrect digit can be entered and left in place.
- **Check** marks every currently-filled incorrect cell in red.
- A red mark clears when that cell is edited.
- Mistake counter increments once per incorrect cell found at each Check.
- **Hint** reveals the correct digit for the selected cell, or a random empty cell if none is selected.
- Hints are unlimited; a game using ≥1 hint is flagged "assisted" and excluded from best-time stats.

### Session
- Timer counts up from first input, with pause.
- Pausing blurs the grid so the puzzle cannot be read while paused.
- **New Game** prompts for difficulty and generates a fresh puzzle.
- **Restart** clears all entries and notes from the current puzzle, resets the timer.
- **Solve** reveals the full solution and ends the game without recording stats.
- Current game state (entries, notes, timer, mistakes) auto-saves to `localStorage`.
- A page refresh resumes the game exactly where it left off.
- Filling the last cell correctly triggers a completion screen showing time and difficulty.

### Profile & stats
- On first visit, prompt for a display name; skippable, defaults to `Player`.
- Display name is stored in `localStorage`; no accounts, no login, no server.
- Per difficulty, track: games completed, best time, average time, current streak, longest streak.
- Store a history of the last 50 completed games.
- Stats are local to that browser and do not sync across devices.

### Presentation
- Light and dark themes.
- First visit follows the OS `prefers-color-scheme`; a header toggle overrides it.
- Theme choice persists to `localStorage`.
- Visual direction is "liquid glass": translucent frosted surfaces, soft depth, generous radii, modern and uncluttered.
- Digits, highlights, and red check marks must remain legible in both themes — legibility wins over glass effect wherever they conflict.
- Responsive: below ~700px the grid fills the viewport width and an on-screen 1–9 pad sits beneath it.
- The on-screen pad includes Notes toggle and Erase.
- Touch targets are ≥44px; nothing depends on hover or on a physical keyboard.

## Behaviour
- Puzzle generation must not block the UI perceptibly; Expert generation is the worst case.
- A corrupt or outdated `localStorage` payload is discarded silently and treated as a fresh start.
- Keyboard and on-screen pad input are interchangeable and always in sync.
- Undo history is cleared on New Game and Restart.
- Completing a puzzle stops the timer and prevents further edits.

## Out of Scope
Deferred for now — do not build these:
- Backend, database, or API of any kind.
- Accounts, login, OAuth, or cross-device sync.
- Multiplayer, leaderboards, or score sharing.
- Daily puzzle / puzzle-of-the-day.
- Puzzle import — photo scanning, pasting a grid, or manual puzzle entry.
- Solver explanations or a technique tutor.
- Sudoku variants — classic 9×9 only, no Killer, Jigsaw, Samurai, X-Sudoku, 16×16.
- Sound effects or music.
- Animation beyond simple state transitions — no confetti or celebration sequences.
- PWA install, offline mode, printing, internationalisation.
- Analytics or tracking of any kind.
