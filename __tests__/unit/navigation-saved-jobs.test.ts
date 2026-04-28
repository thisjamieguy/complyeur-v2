import { describe, expect, it } from 'vitest'
import { getNavItems, getNavSections } from '@/components/navigation/nav-items'

describe('saved jobs navigation flag', () => {
  it('excludes Jobs from nav items when saved jobs is disabled', () => {
    const items = getNavItems({ savedJobsEnabled: false })

    expect(items.some((item) => item.href === '/jobs')).toBe(false)
  })

  it('excludes Jobs from nav sections when saved jobs is disabled', () => {
    const sections = getNavSections({ savedJobsEnabled: false })

    expect(sections.flatMap((section) => section.items).some((item) => item.href === '/jobs')).toBe(false)
  })

  it('includes Jobs when saved jobs is enabled', () => {
    const items = getNavItems({ savedJobsEnabled: true })

    expect(items.some((item) => item.href === '/jobs')).toBe(true)
  })
})
