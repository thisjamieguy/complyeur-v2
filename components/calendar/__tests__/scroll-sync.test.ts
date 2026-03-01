import { describe, expect, it } from 'vitest'
import { syncVerticalScroll } from '../scroll-sync'

describe('syncVerticalScroll', () => {
  it('updates target scrollTop when values differ', () => {
    const source = { scrollTop: 128 }
    const target = { scrollTop: 0 }

    const changed = syncVerticalScroll(source, target)

    expect(changed).toBe(true)
    expect(target.scrollTop).toBe(128)
  })

  it('does nothing when values already match', () => {
    const source = { scrollTop: 64 }
    const target = { scrollTop: 64 }

    const changed = syncVerticalScroll(source, target)

    expect(changed).toBe(false)
    expect(target.scrollTop).toBe(64)
  })
})

