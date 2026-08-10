# Sudoku

A client-side Sudoku web app. Everything runs in the browser — there is no backend. See `prd.md` for the full spec.

## Tech Stack
- React + TypeScript, built with Vite. Strict mode on; no `any`.
- Plain CSS with custom properties. No CSS framework, no UI component library.
- State via React hooks and context — no Redux/Zustand unless the app genuinely outgrows context.
- Persistence is `localStorage` only.
- Deploys to GitHub Pages via a GitHub Actions workflow on push to `main`.

## Architecture Preferences
- Keep puzzle logic (generation, solving, validation) in pure TypeScript modules under `src/lib/` with zero React imports — it must be unit-testable standalone.
- React components render and handle input; they never contain solving logic.
- Generation runs in a Web Worker if it ever blocks the main thread perceptibly.
- Colocate a component's CSS with the component; global tokens live in one `theme.css`.

## Visual System
- "Liquid glass": translucent frosted surfaces over a soft gradient ground, hairline light borders, generous radii, soft shadows.
- Apply `backdrop-filter` to a handful of large surfaces only — header, grid panel, number pad, modals. **Never per-cell**; 81 blurred elements destroys mobile performance.
- Theming is two token sets on `:root` swapped by a `data-theme` attribute, with `prefers-color-scheme` as the default. Never hardcode a color outside `theme.css`.
- Text and check-state red must meet WCAG AA against their actual backdrop. If glass costs contrast, raise the surface opacity — legibility wins.

## Code Style
- Components and types `PascalCase`; functions and variables `camelCase`; CSS custom properties `--kebab-case`.
- Descriptive names over comments. Comment *why*, never *what*.
- Named exports; avoid default exports.

## Coding Principles
- **Single responsibility.** Every function does one thing. If describing it needs an "and", split it.
- **Small functions.** Past ~30 lines, extract sub-operations into named functions.
- **No god components.** One clear concept each; decompose when unrelated concerns accumulate.
- **Composition over inheritance.** Combine small focused pieces rather than deep hierarchies.
- **Fail early and clearly.** Validate at boundaries; never let bad state propagate silently.

## What NOT To Do
- Do not add anything listed under "Out of Scope" in `prd.md`.
- Do not add dependencies without asking — this should stay near-zero-dependency.
- Do not add analytics, telemetry, or any network request.
- Do not append a `Co-Authored-By` trailer to commit messages.
