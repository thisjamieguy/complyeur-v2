import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getBlogPostBySlug, getBlogSlugs } from '@/lib/blog'
import { createPageMetadata, SITE_URL } from '@/lib/metadata'
import { renderMarkdownToHtml } from '@/lib/blog/markdown'

interface BlogPostPageProps {
  params: Promise<{ slug: string }>
}

function formatDate(isoDate: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${isoDate}T00:00:00.000Z`))
}

function estimateReadTime(markdown: string): string {
  const words = markdown.trim().split(/\s+/).length
  const minutes = Math.max(1, Math.round(words / 220))
  return `${minutes} min read`
}

export async function generateStaticParams() {
  const slugs = await getBlogSlugs()
  return slugs.map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params
  const post = await getBlogPostBySlug(slug)

  if (!post) {
    return {
      title: 'Blog post not found',
      robots: {
        index: false,
        follow: false,
      },
    }
  }

  const canonicalPath = `/blog/${post.slug}`
  const resolvedOgImage = post.coverImage
    ? (post.coverImage.startsWith('http://') || post.coverImage.startsWith('https://')
      ? post.coverImage
      : `${SITE_URL}${post.coverImage}`)
    : undefined

  const baseMetadata = createPageMetadata({
    title: post.title,
    description: post.description,
    path: canonicalPath,
    ogImage: resolvedOgImage,
  })

  return {
    ...baseMetadata,
    keywords: post.keywords,
    openGraph: {
      ...baseMetadata.openGraph,
      type: 'article',
      publishedTime: `${post.publishedAt}T00:00:00.000Z`,
      modifiedTime: `${post.updatedAt}T00:00:00.000Z`,
      tags: post.keywords,
    },
  }
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params
  const post = await getBlogPostBySlug(slug)

  if (!post) {
    notFound()
  }

  const articleUrl = `${SITE_URL}/blog/${post.slug}`
  const resolvedCoverImage = post.coverImage
    ? (post.coverImage.startsWith('http://') || post.coverImage.startsWith('https://')
      ? post.coverImage
      : `${SITE_URL}${post.coverImage}`)
    : undefined

  const blogPostingSchema = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.description,
    datePublished: `${post.publishedAt}T00:00:00.000Z`,
    dateModified: `${post.updatedAt}T00:00:00.000Z`,
    mainEntityOfPage: articleUrl,
    url: articleUrl,
    author: {
      '@type': 'Organization',
      name: 'ComplyEur',
    },
    publisher: {
      '@type': 'Organization',
      name: 'ComplyEur',
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_URL}/images/Icons/01_Logo_Horizontal/ComplyEur_Logo_Horizontal_800w.webp`,
      },
    },
    keywords: post.keywords,
    image: resolvedCoverImage,
  }

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Blog',
        item: `${SITE_URL}/blog`,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: post.title,
        item: articleUrl,
      },
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogPostingSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      <div className="landing-shell bg-[color:var(--landing-surface)] py-12 sm:py-16">
        <article className="mx-auto max-w-4xl px-4 sm:px-6">
          <header className="border-b border-slate-200 pb-8">
            <Link href="/blog" className="inline-flex text-sm font-semibold text-brand-700 hover:underline">
              Back to blog
            </Link>

            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">Resources · Blog</p>

            <h1 className="landing-serif mt-4 text-balance text-4xl font-semibold leading-tight text-slate-900 sm:text-5xl">
              {post.title}
            </h1>

            <p className="mt-4 max-w-3xl text-base leading-relaxed text-slate-700 sm:text-lg">{post.description}</p>

            <div className="mt-5 flex flex-wrap items-center gap-4 text-sm text-slate-500">
              <span>Published {formatDate(post.publishedAt)}</span>
              <span>Updated {formatDate(post.updatedAt)}</span>
              <span>{estimateReadTime(post.content)}</span>
            </div>
          </header>

          <div
            className="mt-8 max-w-none"
            dangerouslySetInnerHTML={{
              __html: renderMarkdownToHtml(post.content, { omitFirstH1: true }),
            }}
          />

          <section className="mt-10 border-t border-slate-200 pt-6">
            <p className="text-sm text-slate-600">Topics: {post.keywords.join(' · ')}</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href={post.cta?.href ?? '/pricing'}
                className="inline-flex items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-800"
              >
                {post.cta?.label ?? 'View pricing'}
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center justify-center rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
              >
                Contact team
              </Link>
            </div>
          </section>
        </article>
      </div>
    </>
  )
}
