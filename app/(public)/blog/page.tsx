import Image from 'next/image'
import Link from 'next/link'
import { getAllBlogPosts } from '@/lib/blog'

function formatDate(isoDate: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${isoDate}T00:00:00.000Z`))
}

function estimateReadTime(markdown: string): string {
  const words = markdown.trim().split(/\s+/).length
  const minutes = Math.max(1, Math.round(words / 220))
  return `${minutes} min read`
}

function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value
  }

  return `${value.slice(0, maxLength - 1).trimEnd()}…`
}

const CARD_GRADIENTS = [
  'bg-[linear-gradient(145deg,#102a43_0%,#1f4f7c_55%,#3f8abf_100%)]',
  'bg-[linear-gradient(145deg,#22303c_0%,#355070_55%,#6b8cae_100%)]',
  'bg-[linear-gradient(145deg,#16324f_0%,#245781_55%,#3a7ca5_100%)]',
  'bg-[linear-gradient(145deg,#1f2f46_0%,#3d5a80_55%,#8ca6c4_100%)]',
] as const

export default async function BlogIndexPage() {
  const posts = await getAllBlogPosts()
  const allKeywords = Array.from(
    new Set(posts.flatMap((post) => post.keywords.map((keyword) => keyword.toLowerCase())))
  )

  return (
    <div className="landing-shell bg-[color:var(--landing-surface)] py-12 sm:py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <header className="max-w-4xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">Resources & insights</p>
          <h1 className="landing-serif mt-3 text-balance text-4xl font-semibold leading-tight text-slate-900 sm:text-5xl">
            Schengen compliance articles for office teams
          </h1>
          <p className="mt-4 text-base leading-relaxed text-slate-600 sm:text-lg">
            Straightforward explainers on EU Entry-Exit changes, 90/180-day rules, and practical next steps.
          </p>
        </header>

        <section className="mt-10">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-[0.1em] text-slate-600">Topics</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {allKeywords.slice(0, 8).map((keyword) => (
                <span
                  key={keyword}
                  className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm text-slate-700"
                >
                  {keyword}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            {posts.map((post, index) => (
              <article key={post.slug} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <Link href={`/blog/${post.slug}`} className="block">
                  <div className={`relative aspect-[16/10] overflow-hidden ${post.coverImage ? '' : CARD_GRADIENTS[index % CARD_GRADIENTS.length]}`}>
                    {post.coverImage ? (
                      <Image
                        src={post.coverImage}
                        alt={post.title}
                        fill
                        className="object-cover"
                        sizes="(min-width: 640px) 50vw, 100vw"
                      />
                    ) : null}
                  </div>
                </Link>

                <div className="p-5">
                  <p className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                    {post.keywords[0] ?? 'Guide'}
                  </p>

                  <h2 className="mt-3 text-balance text-2xl font-semibold leading-tight text-slate-900">
                    {post.title}
                  </h2>

                  <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                    <span>Updated {formatDate(post.updatedAt)}</span>
                    <span>{estimateReadTime(post.content)}</span>
                  </div>

                  <p className="mt-3 text-sm leading-relaxed text-slate-700">{truncate(post.description, 110)}</p>

                  <Link href={`/blog/${post.slug}`} className="mt-4 inline-flex text-sm font-semibold text-brand-700 hover:underline">
                    Read article
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
