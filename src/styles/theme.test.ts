import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const css = readFileSync(fileURLToPath(new URL('./theme.css', import.meta.url)), 'utf8')

/** Pulls the token declarations out of the block starting at `selector`. */
function tokensIn(selector: string): Record<string, string> {
  const start = css.indexOf(selector)
  if (start === -1) throw new Error(`Selector not found: ${selector}`)

  const open = css.indexOf('{', start)
  const close = css.indexOf('}', open)
  const body = css.slice(open + 1, close)

  const tokens: Record<string, string> = {}
  for (const [, name, value] of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    tokens[name as string] = (value as string).trim()
  }
  return tokens
}

describe('theme tokens', () => {
  const light = tokensIn(':root {')
  const systemDark = tokensIn(":root:not([data-theme='light'])")
  const explicitDark = tokensIn(":root[data-theme='dark']")

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
    expect(css).toContain('color-scheme: light')
    // The semicolon keeps this from matching the @media prefers-color-scheme query.
    expect(css.match(/color-scheme: dark;/g)).toHaveLength(2)
  })
})
