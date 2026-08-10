import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// Read from disk rather than importing: `?raw` resolves to an empty string under
// vitest's node environment, since CSS never reaches the raw loader there.
const css = readFileSync(fileURLToPath(new URL('./theme.css', import.meta.url)), 'utf8')

/** Pulls the token declarations out of the first block matching `pattern`. */
function tokensIn(pattern: RegExp): Record<string, string> {
  const match = pattern.exec(css)
  if (!match) throw new Error(`Block not found for ${pattern}`)

  const tokens: Record<string, string> = {}
  for (const [, name, value] of (match[1] as string).matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    tokens[name as string] = (value as string).trim().replace(/\s+/g, ' ')
  }
  return tokens
}

// Whitespace and quote style come from whatever the loader hands back, so match loosely.
const LIGHT = /:root\s*\{([^}]*)\}/
const SYSTEM_DARK = /:root:not\(\[data-theme=['"]light['"]\]\)\s*\{([^}]*)\}/
const EXPLICIT_DARK = /:root\[data-theme=['"]dark['"]\]\s*\{([^}]*)\}/

describe('theme tokens', () => {
  const light = tokensIn(LIGHT)
  const systemDark = tokensIn(SYSTEM_DARK)
  const explicitDark = tokensIn(EXPLICIT_DARK)

  it('finds all three palettes', () => {
    expect(Object.keys(light).length).toBeGreaterThan(20)
    expect(Object.keys(systemDark).length).toBeGreaterThan(15)
  })

  it('defines the dark palette identically in both places', () => {
    // Dark is declared twice on purpose - once for the OS preference, once so an
    // explicit toggle wins. Nothing stops the two drifting apart except this test.
    expect(explicitDark).toEqual(systemDark)
  })

  it('overrides every colour token that light defines', () => {
    const geometry = new Set([
      '--radius-panel',
      '--radius-control',
      '--radius-cell',
      '--tap-target',
      '--glass-blur',
    ])

    const missing = Object.keys(light).filter(
      (name) => !geometry.has(name) && !(name in systemDark),
    )
    expect(missing).toEqual([])
  })

  it('sets colour-scheme in every palette', () => {
    expect(css).toMatch(/color-scheme:\s*light;/)
    // The semicolon keeps this from matching the @media prefers-color-scheme query.
    expect(css.match(/color-scheme:\s*dark;/g)).toHaveLength(2)
  })
})
