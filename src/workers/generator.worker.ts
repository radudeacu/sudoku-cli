import { generate } from '../lib/generator'
import type { Difficulty, Puzzle } from '../lib/types'

export interface GenerateRequest {
  readonly difficulty: Difficulty
}

export type GenerateResponse =
  | { readonly ok: true; readonly puzzle: Puzzle }
  | { readonly ok: false; readonly message: string }

// Expert generation can take a few hundred milliseconds, which is long enough to
// stutter the main thread, so it runs here instead.
const scope = self as unknown as DedicatedWorkerGlobalScope

scope.onmessage = (event: MessageEvent<GenerateRequest>) => {
  try {
    const puzzle = generate(event.data.difficulty)
    const response: GenerateResponse = { ok: true, puzzle }
    scope.postMessage(response)
  } catch (error) {
    const response: GenerateResponse = {
      ok: false,
      message: error instanceof Error ? error.message : 'Puzzle generation failed',
    }
    scope.postMessage(response)
  }
}
