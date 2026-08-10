import { describe, expect, it } from 'vitest'
import { formatDuration } from './useTimer'

describe('formatDuration', () => {
  it('pads seconds to two digits', () => {
    expect(formatDuration(0)).toBe('0:00')
    expect(formatDuration(5_000)).toBe('0:05')
    expect(formatDuration(65_000)).toBe('1:05')
  })

  it('rolls minutes past an hour rather than showing hours', () => {
    expect(formatDuration(3_600_000)).toBe('60:00')
    expect(formatDuration(3_725_000)).toBe('62:05')
  })

  it('truncates part-seconds instead of rounding up', () => {
    expect(formatDuration(1_999)).toBe('0:01')
  })
})
