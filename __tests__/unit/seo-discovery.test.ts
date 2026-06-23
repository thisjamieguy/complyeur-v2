import { describe, expect, it } from 'vitest'
import robots from '@/app/robots'
import { GET as getLlmsTxt } from '@/app/llms.txt/route'

describe('SEO and AI discovery routes', () => {
  it('keeps AI crawler rules aligned with private route exclusions', () => {
    const result = robots()
    const rules = Array.isArray(result.rules) ? result.rules : [result.rules]
    const aiUserAgents = [
      'OAI-SearchBot',
      'GPTBot',
      'ChatGPT-User',
      'ClaudeBot',
      'Claude-SearchBot',
      'Claude-User',
      'Google-Extended',
      'PerplexityBot',
      'Perplexity-User',
    ]

    for (const userAgent of aiUserAgents) {
      const rule = rules.find((candidate) => candidate.userAgent === userAgent)

      expect(rule).toBeDefined()
      expect(rule?.allow).toBe('/')
      expect(rule?.disallow).toContain('/dashboard/*')
      expect(rule?.disallow).toContain('/admin/*')
      expect(rule?.disallow).toContain('/api/*')
    }
  })

  it('serves llms.txt with public source pages and private crawl guidance', async () => {
    const response = getLlmsTxt()
    const body = await response.text()

    expect(response.headers.get('content-type')).toContain('text/plain')
    expect(body).toContain('# ComplyEur')
    expect(body).toContain('/faq - Answers about the Schengen 90/180-day rule')
    expect(body).toContain('Authenticated application routes')
    expect(body).toContain('should not be crawled or indexed')
  })
})
