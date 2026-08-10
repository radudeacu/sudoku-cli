export type Rng = () => number

/**
 * mulberry32 - small, fast, and seedable so generator tests are reproducible.
 * Not cryptographic, which does not matter for puzzle shuffling.
 */
export function createRng(seed: number): Rng {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Fisher-Yates, in place. */
export function shuffle<T>(items: T[], rng: Rng): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    const a = items[i] as T
    const b = items[j] as T
    items[i] = b
    items[j] = a
  }
  return items
}
