import { cache } from 'react'
import { promises as fs } from 'fs'
import path from 'path'

const BLOG_DIRECTORY_CANDIDATES = [
  path.resolve(process.cwd(), 'Blogs'),
  path.resolve(process.cwd(), '..', 'Blogs'),
]
const FRONTMATTER_DELIMITER = '---'
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export interface BlogPostCta {
  label: string
  href: string
}

export interface BlogPost {
  slug: string
  title: string
  description: string
  publishedAt: string
  updatedAt: string
  keywords: string[]
  coverImage?: string
  cta?: BlogPostCta
  content: string
  excerpt: string
  sourcePath: string
}

interface ParsedFrontmatter {
  [key: string]: unknown
}

function stripWrappingQuotes(value: string): string {
  const trimmed = value.trim()
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim()
  }

  return trimmed
}

function parseInlineArray(value: string): string[] {
  const trimmed = value.trim()
  if (!trimmed.startsWith('[') || !trimmed.endsWith(']')) {
    return []
  }

  const body = trimmed.slice(1, -1).trim()
  if (body.length === 0) {
    return []
  }

  return body
    .split(',')
    .map((item) => stripWrappingQuotes(item))
    .filter((item) => item.length > 0)
}

function parseFrontmatterBlock(frontmatter: string): ParsedFrontmatter {
  const lines = frontmatter.split(/\r?\n/)
  const parsed: ParsedFrontmatter = {}

  let index = 0
  while (index < lines.length) {
    const line = lines[index]
    if (line.trim().length === 0) {
      index += 1
      continue
    }

    const topLevelMatch = line.match(/^([A-Za-z][\w]*)\s*:\s*(.*)$/)
    if (!topLevelMatch) {
      throw new Error(`Invalid frontmatter line: "${line}"`)
    }

    const [, key, rawValue] = topLevelMatch
    if (rawValue.trim().length > 0) {
      const inlineArray = parseInlineArray(rawValue)
      parsed[key] = inlineArray.length > 0 ? inlineArray : stripWrappingQuotes(rawValue)
      index += 1
      continue
    }

    const nextLine = lines[index + 1] ?? ''

    if (/^\s{2}-\s+/.test(nextLine)) {
      const values: string[] = []
      index += 1

      while (index < lines.length) {
        const arrayLine = lines[index]
        const arrayMatch = arrayLine.match(/^\s{2}-\s+(.*)$/)
        if (!arrayMatch) {
          break
        }

        values.push(stripWrappingQuotes(arrayMatch[1]))
        index += 1
      }

      parsed[key] = values
      continue
    }

    if (/^\s{2}[A-Za-z][\w]*\s*:/.test(nextLine)) {
      const nestedObject: Record<string, string> = {}
      index += 1

      while (index < lines.length) {
        const objectLine = lines[index]
        const objectMatch = objectLine.match(/^\s{2}([A-Za-z][\w]*)\s*:\s*(.*)$/)
        if (!objectMatch) {
          break
        }

        nestedObject[objectMatch[1]] = stripWrappingQuotes(objectMatch[2])
        index += 1
      }

      parsed[key] = nestedObject
      continue
    }

    parsed[key] = ''
    index += 1
  }

  return parsed
}

function splitFrontmatter(source: string): { frontmatter: ParsedFrontmatter; content: string } {
  const normalized = source.replace(/^\uFEFF/, '')
  const lines = normalized.split(/\r?\n/)

  if (lines[0]?.trim() !== FRONTMATTER_DELIMITER) {
    throw new Error('Frontmatter delimiter (---) missing at top of file.')
  }

  let endIndex = -1
  for (let i = 1; i < lines.length; i += 1) {
    if (lines[i].trim() === FRONTMATTER_DELIMITER) {
      endIndex = i
      break
    }
  }

  if (endIndex === -1) {
    throw new Error('Closing frontmatter delimiter (---) missing.')
  }

  const frontmatterLines = lines.slice(1, endIndex)
  const contentLines = lines.slice(endIndex + 1)

  return {
    frontmatter: parseFrontmatterBlock(frontmatterLines.join('\n')),
    content: contentLines.join('\n').trim(),
  }
}

function validateDate(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || !ISO_DATE_PATTERN.test(value)) {
    throw new Error(`"${fieldName}" must be an ISO date string (YYYY-MM-DD).`)
  }

  const date = new Date(`${value}T00:00:00.000Z`)
  if (Number.isNaN(date.getTime())) {
    throw new Error(`"${fieldName}" is not a valid date.`)
  }

  return value
}

function validateString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`"${fieldName}" must be a non-empty string.`)
  }

  return value.trim()
}

function normalizeKeywords(value: unknown): string[] {
  if (!Array.isArray(value)) {
    throw new Error('"keywords" must be an array of strings.')
  }

  const keywords = value
    .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
    .filter((entry) => entry.length > 0)

  if (keywords.length === 0) {
    throw new Error('"keywords" must contain at least one keyword.')
  }

  return keywords
}

function normalizeCta(value: unknown): BlogPostCta | undefined {
  if (value === undefined) {
    return undefined
  }

  if (!value || typeof value !== 'object') {
    throw new Error('"cta" must be an object with label and href.')
  }

  const record = value as Record<string, unknown>
  const label = validateString(record.label, 'cta.label')
  const href = validateString(record.href, 'cta.href')

  if (!href.startsWith('/') && !href.startsWith('https://') && !href.startsWith('http://')) {
    throw new Error('"cta.href" must be an absolute URL or an internal path.')
  }

  return { label, href }
}

function buildExcerpt(markdown: string): string {
  const firstParagraph = markdown
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .find((block) => block.length > 0 && !block.startsWith('#') && !block.startsWith('*') && !block.startsWith('-'))

  if (!firstParagraph) {
    return ''
  }

  const plainText = firstParagraph
    .replace(/\[(.*?)\]\((.*?)\)/g, '$1')
    .replace(/[*_`>#-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

  return plainText.length > 180 ? `${plainText.slice(0, 177).trim()}...` : plainText
}

function normalizePost(frontmatter: ParsedFrontmatter, content: string, sourcePath: string): BlogPost {
  const slug = validateString(frontmatter.slug, 'slug')
  if (!SLUG_PATTERN.test(slug)) {
    throw new Error('"slug" must use lowercase kebab-case.')
  }

  const post: BlogPost = {
    slug,
    title: validateString(frontmatter.title, 'title'),
    description: validateString(frontmatter.description, 'description'),
    publishedAt: validateDate(frontmatter.publishedAt, 'publishedAt'),
    updatedAt: validateDate(frontmatter.updatedAt, 'updatedAt'),
    keywords: normalizeKeywords(frontmatter.keywords),
    content,
    excerpt: buildExcerpt(content),
    sourcePath,
  }

  if (frontmatter.coverImage !== undefined) {
    post.coverImage = validateString(frontmatter.coverImage, 'coverImage')
  }

  const cta = normalizeCta(frontmatter.cta)
  if (cta) {
    post.cta = cta
  }

  if (post.excerpt.length === 0) {
    post.excerpt = post.description
  }

  return post
}

export function parseBlogPostSource(source: string, sourcePath: string): BlogPost {
  const { frontmatter, content } = splitFrontmatter(source)
  return normalizePost(frontmatter, content, sourcePath)
}

export function assertUniqueBlogSlugs(posts: BlogPost[]): void {
  const seenSlugs = new Set<string>()
  for (const post of posts) {
    if (seenSlugs.has(post.slug)) {
      throw new Error(`Duplicate blog slug found: "${post.slug}"`)
    }
    seenSlugs.add(post.slug)
  }
}

async function readBlogFiles(): Promise<BlogPost[]> {
  const existingDirectory = await BLOG_DIRECTORY_CANDIDATES.reduce<Promise<string | null>>(async (foundPromise, candidate) => {
    const found = await foundPromise
    if (found) return found

    try {
      const stat = await fs.stat(candidate)
      return stat.isDirectory() ? candidate : null
    } catch {
      return null
    }
  }, Promise.resolve<string | null>(null))

  if (!existingDirectory) {
    throw new Error(`Blog directory not found. Checked: ${BLOG_DIRECTORY_CANDIDATES.join(', ')}`)
  }

  const entries = await fs.readdir(existingDirectory, { withFileTypes: true })
  const markdownFiles = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
    .map((entry) => path.join(existingDirectory, entry.name))

  const posts = await Promise.all(
    markdownFiles.map(async (filePath) => {
      const source = await fs.readFile(filePath, 'utf8')
      return parseBlogPostSource(source, filePath)
    })
  )

  assertUniqueBlogSlugs(posts)

  return posts.sort((a, b) => {
    const aTime = new Date(a.publishedAt).getTime()
    const bTime = new Date(b.publishedAt).getTime()
    return bTime - aTime
  })
}

const loadBlogPosts = cache(readBlogFiles)

export async function getAllBlogPosts(): Promise<BlogPost[]> {
  return loadBlogPosts()
}

export async function getBlogPostBySlug(slug: string): Promise<BlogPost | null> {
  const posts = await loadBlogPosts()
  return posts.find((post) => post.slug === slug) ?? null
}

export async function getBlogSlugs(): Promise<string[]> {
  const posts = await loadBlogPosts()
  return posts.map((post) => post.slug)
}
