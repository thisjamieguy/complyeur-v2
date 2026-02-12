'use client'

import Link from 'next/link'
import Image from 'next/image'
import {
  ArrowRight,
  ShieldCheck,
  Calendar,
  Users,
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  Clock
} from 'lucide-react'

export default function LandingNewPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-50 font-sans selection:bg-brand-100 selection:text-brand-900">
      {/* Background Effects */}
      <div className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute -top-[20%] -left-[10%] h-[50rem] w-[50rem] rounded-full bg-brand-200/20 blur-3xl" />
        <div className="absolute top-[20%] -right-[10%] h-[40rem] w-[40rem] rounded-full bg-blue-200/20 blur-3xl" />
        <div className="absolute bottom-0 left-1/2 h-[30rem] w-[60rem] -translate-x-1/2 rounded-full bg-indigo-100/30 blur-3xl" />
        <div className="absolute inset-0 bg-[url('/images/grid-pattern.svg')] opacity-[0.03]" />
      </div>

      {/* Navbar */}
      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
           <Image
            src="/images/Icons/01_Logo_Horizontal/ComplyEur_Logo_Horizontal.svg"
            alt="ComplyEur"
            width={140}
            height={40}
            className="h-8 w-auto"
            priority
          />
        </div>
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
          <Link href="#features" className="hover:text-brand-700 transition-colors">Features</Link>
          <Link href="#how-it-works" className="hover:text-brand-700 transition-colors">How it works</Link>
          <Link href="/pricing" className="hover:text-brand-700 transition-colors">Pricing</Link>
          <Link href="/faq" className="hover:text-brand-700 transition-colors">FAQ</Link>
        </nav>
        <div className="flex items-center gap-4">
          <Link href="/login" className="hidden sm:block text-sm font-semibold text-slate-900 hover:text-brand-700">
            Log in
          </Link>
          <Link
            href="/signup"
            className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-slate-800 hover:shadow-lg hover:shadow-brand-900/20"
          >
            Get Started
          </Link>
        </div>
      </header>

      <main className="relative z-10">
        {/* Hero Section */}
        <section className="mx-auto max-w-7xl px-6 pt-16 pb-24 sm:pt-24 sm:pb-32 lg:pt-32">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50/50 px-3 py-1 text-xs font-semibold text-brand-700 mb-6">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-500"></span>
                </span>
                New: Interactive Trip Calendar
              </div>
              <h1 className="landing-serif text-5xl font-bold tracking-tight text-slate-900 sm:text-6xl mb-6">
                Schengen Compliance, <span className="text-brand-700">Solved.</span>
              </h1>
              <p className="text-lg leading-8 text-slate-600 mb-8">
                The automated 90/180-day tracking platform for UK and non-EU teams.
                Prevent overstays, avoid fines, and manage business travel with confidence.
              </p>
              <div className="flex flex-wrap items-center gap-4">
                <Link
                  href="/signup"
                  className="inline-flex items-center gap-2 rounded-full bg-brand-600 px-6 py-3.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 transition-all"
                >
                  Start Tracking Free
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/demo"
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-6 py-3.5 text-sm font-semibold text-slate-900 shadow-sm hover:bg-slate-50 transition-all"
                >
                  View Demo
                </Link>
              </div>
              <div className="mt-10 flex items-center gap-x-6">
                <div className="flex -space-x-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-8 w-8 rounded-full bg-slate-200 ring-2 ring-white" />
                  ))}
                </div>
                <div className="text-sm text-slate-600">
                  Trusted by <span className="font-semibold text-slate-900">500+</span> companies
                </div>
              </div>
            </div>
            <div className="relative lg:ml-auto">
               {/* Abstract UI Mockup */}
               <div className="relative rounded-2xl border border-slate-200 bg-white/80 p-2 shadow-2xl backdrop-blur-sm">
                  <div className="rounded-xl bg-slate-50 border border-slate-100 overflow-hidden">
                    <div className="flex items-center border-b border-slate-200 bg-white px-4 py-3">
                        <div className="flex gap-1.5">
                            <div className="h-3 w-3 rounded-full bg-red-400" />
                            <div className="h-3 w-3 rounded-full bg-amber-400" />
                            <div className="h-3 w-3 rounded-full bg-green-400" />
                        </div>
                        <div className="mx-auto text-xs font-medium text-slate-500">ComplyEur Dashboard</div>
                    </div>
                    <div className="p-6 space-y-6">
                        {/* Mock Stats */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="rounded-lg border border-slate-100 bg-white p-4 shadow-sm">
                                <div className="text-xs text-slate-500">Days Remaining</div>
                                <div className="text-2xl font-bold text-green-600">42 Days</div>
                                <div className="mt-1 h-1.5 w-full rounded-full bg-slate-100">
                                    <div className="h-1.5 w-[60%] rounded-full bg-green-500" />
                                </div>
                            </div>
                            <div className="rounded-lg border border-slate-100 bg-white p-4 shadow-sm">
                                <div className="text-xs text-slate-500">Risk Level</div>
                                <div className="text-2xl font-bold text-slate-900">Low</div>
                                <div className="mt-2 flex items-center gap-1 text-[10px] text-slate-400">
                                    <ShieldCheck className="h-3 w-3" /> Compliant
                                </div>
                            </div>
                        </div>
                        {/* Mock List */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between rounded-md bg-white p-3 shadow-sm border border-slate-100">
                                <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold text-xs">JS</div>
                                    <div>
                                        <div className="text-sm font-medium text-slate-900">James Smith</div>
                                        <div className="text-xs text-slate-500">Paris, France</div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm font-medium text-slate-900">5 Days</div>
                                    <div className="text-xs text-slate-500">Oct 12 - Oct 17</div>
                                </div>
                            </div>
                            <div className="flex items-center justify-between rounded-md bg-white p-3 shadow-sm border border-slate-100 opacity-60">
                                <div className="flex items-center gap-3">
                                    <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold text-xs">AL</div>
                                    <div>
                                        <div className="text-sm font-medium text-slate-900">Ana Lopez</div>
                                        <div className="text-xs text-slate-500">Berlin, Germany</div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm font-medium text-slate-900">12 Days</div>
                                    <div className="text-xs text-slate-500">Oct 02 - Oct 14</div>
                                </div>
                            </div>
                        </div>
                    </div>
                  </div>
               </div>
               {/* Floating Badge */}
               <div className="absolute -bottom-6 -left-6 rounded-xl border border-slate-100 bg-white p-4 shadow-xl">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-green-600">
                        <CheckCircle2 className="h-6 w-6" />
                    </div>
                    <div>
                        <div className="text-sm font-bold text-slate-900">Audit Ready</div>
                        <div className="text-xs text-slate-500">Export reports in 1-click</div>
                    </div>
                  </div>
               </div>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section id="features" className="py-24 bg-white">
            <div className="mx-auto max-w-7xl px-6">
                <div className="mx-auto max-w-2xl text-center mb-16">
                    <h2 className="landing-serif text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Everything you need for Schengen compliance</h2>
                    <p className="mt-4 text-lg text-slate-600">Manual spreadsheets are risky. Switch to automated tracking designed for modern distributed teams.</p>
                </div>

                <div className="grid md:grid-cols-3 gap-8">
                    {[
                        { icon: Clock, title: "90/180-Day Calculator", desc: "Our engine automatically calculates rolling windows, handling complex overlapping trips and single-day travel correctly." },
                        { icon: AlertTriangle, title: "Proactive Alerts", desc: "Get notified before an employee breaches their limit. Traffic light status system (Green, Amber, Red) keeps you informed." },
                        { icon: Calendar, title: "Trip Forecasting", desc: "\"What if\" analysis lets you check future travel plans against remaining allowance to prevent accidental overstays." },
                        { icon: Users, title: "Team Management", desc: "Manage unlimited employees. Group by department or project. Bulk import trips via CSV/Excel for easy migration." },
                        { icon: ShieldCheck, title: "GDPR Compliant", desc: "Data stored in the EU. Enterprise-grade security. Full data export and deletion capabilities for DSAR compliance." },
                        { icon: BarChart3, title: "Audit Reports", desc: "Generate instant compliance reports for immigration authorities or internal audits. Prove your compliance history." }
                    ].map((feature, i) => (
                        <div key={i} className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-8 transition-all hover:border-brand-200 hover:shadow-lg">
                            <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-white text-brand-600 shadow-sm ring-1 ring-slate-900/5">
                                <feature.icon className="h-6 w-6" />
                            </div>
                            <h3 className="text-xl font-semibold text-slate-900">{feature.title}</h3>
                            <p className="mt-4 text-slate-600 leading-relaxed">{feature.desc}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>

        {/* CTA Section */}
        <section className="relative overflow-hidden py-24">
            <div className="absolute inset-0 bg-slate-900">
                <div className="absolute inset-0 bg-[url('/images/grid-pattern.svg')] opacity-[0.05]" />
                <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[30rem] w-[60rem] rounded-full bg-brand-500/20 blur-3xl" />
            </div>
            <div className="relative mx-auto max-w-7xl px-6 text-center">
                <h2 className="landing-serif text-3xl font-bold tracking-tight text-white sm:text-4xl">Ready to secure your team's travel?</h2>
                <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-300">
                    Join forward-thinking companies using ComplyEur to manage Schengen compliance. Start your free trial today.
                </p>
                <div className="mt-10 flex items-center justify-center gap-4">
                    <Link
                        href="/signup"
                        className="rounded-full bg-white px-8 py-3.5 text-sm font-semibold text-slate-900 shadow-sm hover:bg-brand-50 transition-all"
                    >
                        Get Started for Free
                    </Link>
                    <Link
                        href="/contact"
                        className="rounded-full border border-slate-700 bg-transparent px-8 py-3.5 text-sm font-semibold text-white hover:bg-slate-800 transition-all"
                    >
                        Contact Sales
                    </Link>
                </div>
            </div>
        </section>

        {/* Footer */}
        <footer className="bg-white border-t border-slate-200 pt-16 pb-8">
            <div className="mx-auto max-w-7xl px-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
                    <div className="col-span-2 md:col-span-1">
                        <Image
                            src="/images/Icons/01_Logo_Horizontal/ComplyEur_Logo_Horizontal.svg"
                            alt="ComplyEur"
                            width={120}
                            height={32}
                            className="h-6 w-auto mb-4"
                        />
                        <p className="text-sm text-slate-500">
                            Simplifying Schengen compliance for modern businesses.
                        </p>
                    </div>
                    {/* Footer links would go here */}
                </div>
                <div className="border-t border-slate-100 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-xs text-slate-400">
                        © {new Date().getFullYear()} ComplyEur. All rights reserved.
                    </p>
                </div>
            </div>
        </footer>
      </main>
    </div>
  )
}