function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function normalizeUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim()

  if (trimmed.startsWith('/') || trimmed.startsWith('https://') || trimmed.startsWith('http://')) {
    return trimmed
  }

  return '#'
}

function renderInline(line: string): string {
  const escaped = escapeHtml(line)

  const withLinks = escaped.replace(/\[(.+?)\]\((.+?)\)/g, (_match, text: string, url: string) => {
    const safeHref = normalizeUrl(url)
    const external = safeHref.startsWith('http://') || safeHref.startsWith('https://')
    const target = external ? ' target="_blank" rel="noopener noreferrer"' : ''
    return `<a href="${safeHref}" class="font-medium text-brand-700 underline decoration-brand-300 underline-offset-4 hover:text-brand-800"${target}>${text}</a>`
  })

  return withLinks
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code class="rounded bg-slate-100 px-1 py-0.5 text-[0.95em]">$1</code>')
}

export interface MarkdownRenderOptions {
  omitFirstH1?: boolean
}

type ListType = 'ul' | 'ol'

function openList(listType: ListType, html: string[]): void {
  if (listType === 'ul') {
    html.push('<ul class="mt-4 ml-6 list-disc space-y-2 text-base leading-relaxed text-slate-700 sm:text-lg">')
    return
  }

  html.push('<ol class="mt-4 ml-6 list-decimal space-y-2 text-base leading-relaxed text-slate-700 sm:text-lg">')
}

export function renderMarkdownToHtml(markdown: string, options: MarkdownRenderOptions = {}): string {
  const lines = markdown.split(/\r?\n/)
  const html: string[] = []

  let activeList: ListType | null = null
  let firstH1Seen = false

  const closeListIfNeeded = () => {
    if (!activeList) {
      return
    }

    html.push(activeList === 'ul' ? '</ul>' : '</ol>')
    activeList = null
  }

  const setListType = (nextType: ListType) => {
    if (activeList === nextType) {
      return
    }

    closeListIfNeeded()
    openList(nextType, html)
    activeList = nextType
  }

  for (const rawLine of lines) {
    const line = rawLine.trim()

    if (line.length === 0) {
      closeListIfNeeded()
      continue
    }

    if (/^---+$/.test(line)) {
      closeListIfNeeded()
      html.push('<hr class="my-8 border-slate-200" />')
      continue
    }

    const headingMatch = line.match(/^(#{1,3})\s+(.*)$/)
    if (headingMatch) {
      closeListIfNeeded()
      const level = headingMatch[1].length
      const text = renderInline(headingMatch[2])

      if (level === 1) {
        if (options.omitFirstH1 && !firstH1Seen) {
          firstH1Seen = true
          continue
        }

        firstH1Seen = true
        html.push(`<h1 class="landing-serif mt-10 text-balance text-4xl font-semibold leading-tight text-slate-900 sm:text-5xl">${text}</h1>`)
      } else if (level === 2) {
        html.push(`<h2 class="mt-10 text-2xl font-semibold text-slate-900 sm:text-3xl">${text}</h2>`)
      } else {
        html.push(`<h3 class="mt-6 text-xl font-semibold text-slate-900">${text}</h3>`)
      }

      continue
    }

    const unorderedListMatch = line.match(/^-\s+(.*)$/)
    if (unorderedListMatch) {
      setListType('ul')
      html.push(`<li>${renderInline(unorderedListMatch[1])}</li>`)
      continue
    }

    const orderedListMatch = line.match(/^\d+\.\s+(.*)$/)
    if (orderedListMatch) {
      setListType('ol')
      html.push(`<li>${renderInline(orderedListMatch[1])}</li>`)
      continue
    }

    closeListIfNeeded()

    if (line.startsWith('>')) {
      const quoteText = renderInline(line.replace(/^>\s*/, ''))
      html.push(`<blockquote class="mt-5 border-l-4 border-slate-300 bg-slate-50 px-4 py-3 text-slate-700">${quoteText}</blockquote>`)
      continue
    }

    html.push(`<p class="mt-4 text-base leading-relaxed text-slate-700 sm:text-lg">${renderInline(line)}</p>`)
  }

  closeListIfNeeded()
  return html.join('\n')
}
