'use client'

import Image from 'next/image'
import Link from 'next/link'
import React from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'default' | 'sm' | 'lg'
  children: React.ReactNode
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'default', className = '', children, ...props }, ref) => {
    const baseStyles =
      'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50'

    const variants = {
      primary: 'bg-brand-600 text-white hover:bg-brand-700',
      secondary: 'bg-white text-slate-900 hover:bg-slate-100',
      ghost: 'text-slate-300 hover:bg-white/10 hover:text-white',
    }

    const sizes = {
      default: 'h-10 px-4 py-2 text-sm',
      sm: 'h-9 px-4 text-sm',
      lg: 'h-12 px-6 text-base',
    }

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      >
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'

const ArrowRight = ({ className = '', size = 16 }: { className?: string; size?: number }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M5 12h14" />
    <path d="m12 5 7 7-7 7" />
  </svg>
)

const Menu = ({ className = '', size = 24 }: { className?: string; size?: number }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <line x1="4" x2="20" y1="12" y2="12" />
    <line x1="4" x2="20" y1="6" y2="6" />
    <line x1="4" x2="20" y1="18" y2="18" />
  </svg>
)

const X = ({ className = '', size = 24 }: { className?: string; size?: number }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </svg>
)

const Navigation = React.memo(() => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false)

  return (
    <header className="fixed top-0 z-50 w-full border-b border-slate-700/50 bg-slate-950/85 backdrop-blur-md">
      <nav className="mx-auto max-w-7xl px-6 py-4">
        <div className="flex items-center justify-between">
          <Link href="/landing" aria-label="ComplyEur preview home">
            <Image
              src="/images/Icons/01_Logo_Horizontal/ComplyEur_Logo_Horizontal.svg"
              alt="ComplyEur"
              width={172}
              height={46}
              className="h-8 w-auto brightness-[1.15]"
              priority
            />
          </Link>

          <div className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center justify-center gap-8 md:flex">
            <a href="#product" className="text-sm text-slate-300 transition-colors hover:text-white">Product</a>
            <a href="#benefits" className="text-sm text-slate-300 transition-colors hover:text-white">Benefits</a>
            <a href="#how-it-works" className="text-sm text-slate-300 transition-colors hover:text-white">How it works</a>
          </div>

          <div className="hidden items-center gap-4 md:flex">
            <Link href="/login"><Button type="button" variant="ghost" size="sm">Sign in</Button></Link>
            <Link href="/signup"><Button type="button" variant="secondary" size="sm">Apply</Button></Link>
          </div>

          <button
            type="button"
            className="text-white md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </nav>

      {mobileMenuOpen && (
        <div className="animate-[slideDown_0.3s_ease-out] border-t border-slate-700/50 bg-slate-950/95 backdrop-blur-md md:hidden">
          <div className="flex flex-col gap-4 px-6 py-4">
            <a
              href="#product"
              className="py-2 text-sm text-slate-300 transition-colors hover:text-white"
              onClick={() => setMobileMenuOpen(false)}
            >
              Product
            </a>
            <a
              href="#benefits"
              className="py-2 text-sm text-slate-300 transition-colors hover:text-white"
              onClick={() => setMobileMenuOpen(false)}
            >
              Benefits
            </a>
            <a
              href="#how-it-works"
              className="py-2 text-sm text-slate-300 transition-colors hover:text-white"
              onClick={() => setMobileMenuOpen(false)}
            >
              How it works
            </a>
            <div className="flex flex-col gap-2 border-t border-slate-700/50 pt-4">
              <Link href="/login"><Button type="button" variant="ghost" size="sm" className="w-full">Sign in</Button></Link>
              <Link href="/signup"><Button type="button" variant="secondary" size="sm" className="w-full">Apply for Early Access</Button></Link>
            </div>
          </div>
        </div>
      )}
    </header>
  )
})

Navigation.displayName = 'Navigation'

const Hero = React.memo(() => {
  return (
    <section className="relative flex min-h-screen flex-col items-center justify-start px-6 pb-20 pt-28 md:pt-32">
      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>

      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-[20%] h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-brand-500/25 blur-[96px]" />
        <div className="absolute right-[8%] top-[34%] h-[280px] w-[280px] rounded-full bg-brand-700/35 blur-[80px]" />
      </div>

      <aside className="mb-8 inline-flex max-w-full flex-wrap items-center justify-center gap-2 rounded-full border border-brand-400/40 bg-brand-900/35 px-4 py-2 backdrop-blur-sm">
        <span className="whitespace-nowrap text-center text-xs text-slate-200">
          Private early access for UK teams
        </span>
        <a
          href="/pricing"
          className="flex items-center gap-1 whitespace-nowrap text-xs text-brand-200 transition-all hover:text-white active:scale-95"
          aria-label="Review pricing options"
        >
          See pricing
          <ArrowRight size={12} />
        </a>
      </aside>

      <h1
        className="mb-6 max-w-4xl px-6 text-center text-4xl font-semibold leading-tight text-white md:text-5xl lg:text-6xl"
        style={{
          background: 'linear-gradient(to bottom, #ffffff, #e5eef8, rgba(229, 238, 248, 0.75))',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          letterSpacing: '-0.03em',
        }}
      >
        Know every Schengen day before
        <br />
        each EU trip is approved
      </h1>

      <p className="mb-10 max-w-3xl px-6 text-center text-base leading-relaxed text-slate-300 md:text-lg">
        Built for UK businesses sending staff to the EU, ComplyEur gives HR, operations, and mobility teams a live
        90/180-day compliance view for every traveller.
      </p>

      <p className="mb-12 max-w-3xl px-6 text-center text-sm text-slate-400 md:text-base">
        As the EU Entry/Exit System (EES) introduces automated border checks, manual day counting leaves less room for
        error. ComplyEur acts as your compliance control layer and system of record for Schengen travel.
      </p>

      <div id="product" className="relative z-10 mb-16 flex flex-wrap items-center justify-center gap-4">
        <Link href="/signup">
          <Button type="button" variant="primary" size="lg">Apply for Early Access</Button>
        </Link>
        <Link
          href="/landing/preview"
          className="inline-flex h-12 items-center justify-center rounded-xl border border-brand-400/40 px-6 text-base font-semibold text-slate-100 transition hover:border-brand-300 hover:bg-white/5"
          aria-label="Try the interactive calendar preview"
        >
          Try the interactive preview
        </Link>
      </div>

      <div className="w-full max-w-6xl pb-10">
        <div className="grid gap-4 md:grid-cols-3" id="benefits">
          <div className="rounded-2xl border border-brand-500/30 bg-slate-900/70 p-5">
            <p className="text-xs uppercase tracking-[0.12em] text-brand-200">Coverage</p>
            <p className="mt-2 text-3xl font-semibold text-white">90/180</p>
            <p className="mt-2 text-sm text-slate-300">Rolling windows recalculate daily as travel records change.</p>
          </div>
          <div className="rounded-2xl border border-brand-500/30 bg-slate-900/70 p-5">
            <p className="text-xs uppercase tracking-[0.12em] text-brand-200">Risk pulse</p>
            <p className="mt-2 text-3xl font-semibold text-white">17 days</p>
            <p className="mt-2 text-sm text-slate-300">Average warning lead time before a potential breach.</p>
          </div>
          <div className="rounded-2xl border border-brand-500/30 bg-slate-900/70 p-5">
            <p className="text-xs uppercase tracking-[0.12em] text-brand-200">Data import</p>
            <p className="mt-2 text-3xl font-semibold text-white">CSV + XLSX</p>
            <p className="mt-2 text-sm text-slate-300">Import historical trips in minutes and track from day one.</p>
          </div>
        </div>
      </div>

      <div className="w-full max-w-6xl rounded-3xl border border-brand-500/30 bg-slate-900/70 p-6 shadow-[0_24px_80px_rgba(56,80,112,0.35)] md:p-8">
        <div id="how-it-works" className="mb-6 flex items-center justify-between gap-4 border-b border-slate-700/70 pb-5">
          <h2 className="text-xl font-semibold text-white md:text-2xl">How it works</h2>
          <Link href="/landing/preview" className="text-sm font-semibold text-brand-200 hover:text-white">
            Open calendar preview
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <article className="rounded-2xl border border-slate-700/80 bg-slate-950/60 p-5">
            <p className="text-xs uppercase tracking-[0.14em] text-brand-300">Step 1</p>
            <h3 className="mt-2 text-lg font-semibold text-white">Add employees</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">
              Create profiles for travellers so each person has an accurate Schengen day count.
            </p>
          </article>
          <article className="rounded-2xl border border-slate-700/80 bg-slate-950/60 p-5">
            <p className="text-xs uppercase tracking-[0.14em] text-brand-300">Step 2</p>
            <h3 className="mt-2 text-lg font-semibold text-white">Import or log trips</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">
              Upload travel history or add new plans and see rolling-window updates instantly.
            </p>
          </article>
          <article className="rounded-2xl border border-slate-700/80 bg-slate-950/60 p-5">
            <p className="text-xs uppercase tracking-[0.14em] text-brand-300">Step 3</p>
            <h3 className="mt-2 text-lg font-semibold text-white">Act before risk</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">
              Use live red/amber/green status to approve plans before compliance issues escalate.
            </p>
          </article>
        </div>
      </div>
    </section>
  )
})

Hero.displayName = 'Hero'

export default function SaaSTemplate() {
  return (
    <main className="min-h-screen bg-slate-950 pt-16 text-white">
      <Navigation />
      <Hero />
    </main>
  )
}
