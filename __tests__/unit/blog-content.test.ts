import { describe, expect, it } from 'vitest'
import {
  assertUniqueBlogSlugs,
  getAllBlogPosts,
  parseBlogPostSource,
  type BlogPost,
} from '@/lib/blog'

describe('blog content contract', () => {
  it('parses valid frontmatter and markdown', () => {
    const source = `---
slug: sample-post
title: Sample Post
description: Sample description
publishedAt: 2026-03-10
updatedAt: 2026-03-11
keywords:
  - schengen
  - ees
cta:
  label: Read more
  href: /pricing
---

# Sample

Paragraph content.`

    const post = parseBlogPostSource(source, '/tmp/sample.md')

    expect(post.slug).toBe('sample-post')
    expect(post.keywords).toEqual(['schengen', 'ees'])
    expect(post.cta).toEqual({ label: 'Read more', href: '/pricing' })
    expect(post.excerpt.length).toBeGreaterThan(0)
  })

  it('rejects missing required fields', () => {
    const invalidSource = `---
slug: missing-description
title: Missing Description
publishedAt: 2026-03-10
updatedAt: 2026-03-11
keywords:
  - schengen
---

Body`

    expect(() => parseBlogPostSource(invalidSource, '/tmp/invalid.md')).toThrow(
      '"description" must be a non-empty string.'
    )
  })

  it('rejects invalid date fields', () => {
    const invalidSource = `---
slug: invalid-date
title: Invalid Date
description: Description
publishedAt: 10-03-2026
updatedAt: 2026-03-11
keywords:
  - schengen
---

Body`

    expect(() => parseBlogPostSource(invalidSource, '/tmp/date.md')).toThrow(
      '"publishedAt" must be an ISO date string (YYYY-MM-DD).'
    )
  })

  it('rejects duplicate slugs', () => {
    const post = {
      slug: 'duplicate-slug',
      title: 'Title',
      description: 'Description',
      publishedAt: '2026-03-10',
      updatedAt: '2026-03-11',
      keywords: ['ees'],
      content: 'Body',
      excerpt: 'Body',
      sourcePath: '/tmp/a.md',
    } satisfies BlogPost

    expect(() => assertUniqueBlogSlugs([post, { ...post, sourcePath: '/tmp/b.md' }])).toThrow(
      'Duplicate blog slug found: "duplicate-slug"'
    )
  })

  it('loads seeded blog posts from the Blogs directory', async () => {
    const posts = await getAllBlogPosts()

    expect(posts.length).toBeGreaterThanOrEqual(2)
    expect(posts.map((post) => post.slug)).toContain('ees-border-enforcement-shift')
    expect(posts.map((post) => post.slug)).toContain('how-ees-works-practical-guide')
  })
})
