import Link from 'next/link'
import Image from 'next/image'

export default function AboutPage() {
  return (
    <div className="landing-shell relative overflow-hidden bg-[color:var(--landing-surface)] py-14 sm:py-16">
      <div className="pointer-events-none absolute inset-0">
        <div className="landing-aurora-top absolute -top-32 left-[-8rem] h-[24rem] w-[24rem] rounded-full" />
        <div className="landing-aurora-bottom absolute right-[-8rem] top-[18rem] h-[22rem] w-[22rem] rounded-full" />
        <div className="landing-grid absolute inset-0" />
      </div>

      <div className="relative mx-auto max-w-5xl px-4 sm:px-6">
        <div className="landing-panel rounded-3xl border border-slate-200/80 bg-white/95 p-6 shadow-xl shadow-slate-900/5 backdrop-blur sm:p-10">
          <div className="max-w-3xl">
            <Link href="/landing" className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 shadow-sm hover:opacity-85 transition-opacity">
              <Image
                src="/images/Icons/01_Logo_Horizontal/ComplyEur_Logo_Horizontal.svg"
                alt="ComplyEur"
                width={150}
                height={40}
                className="h-7 w-auto"
                priority
              />
            </Link>
            <Link href="/landing" className="mt-4 inline-flex text-sm font-semibold text-brand-700 hover:underline">
              Back to landing
            </Link>
            <p className="mt-5 inline-flex items-center rounded-full border border-brand-200 bg-brand-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-brand-700">
              About
            </p>
            <h1 className="landing-serif mt-4 text-balance text-4xl font-semibold leading-tight text-slate-900 sm:text-5xl">
              About ComplyEur
            </h1>
            <p className="mt-4 text-base leading-relaxed text-slate-600 sm:text-lg">
              ComplyEur helps UK businesses manage Schengen 90/180-day compliance with a practical, operational view of employee travel risk.
            </p>
            <p className="mt-4 text-sm text-slate-500">
              Looking for specifics? See <Link href="/pricing" className="font-medium text-brand-700 hover:underline">pricing</Link> or browse the <Link href="/faq" className="font-medium text-brand-700 hover:underline">FAQ</Link>.
            </p>
          </div>

          <div className="mt-10 space-y-8">
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-semibold text-slate-900">What We Do</h2>
              <p className="mt-4 text-base leading-relaxed text-slate-700">
                ComplyEur is a compliance tracking platform designed for UK businesses with employees who travel to the European Union. We help companies monitor and manage the EU&apos;s Schengen 90/180-day visa rule, ensuring your team stays compliant while traveling for work.
              </p>
              <p className="mt-4 text-base leading-relaxed text-slate-700">
                Since Brexit, UK nationals no longer have freedom of movement in the EU. When traveling to Schengen Area countries, UK citizens are limited to 90 days within any rolling 180-day period. Tracking this manually across multiple employees and trips is complex and error-prone. ComplyEur automates this process.
              </p>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-semibold text-slate-900">The 90/180-Day Rule</h2>
              <p className="mt-4 text-base leading-relaxed text-slate-700">
                The Schengen visa rule applies to all non-EU citizens, including UK passport holders. Here&apos;s how it works:
              </p>
              <ul className="mt-4 ml-6 list-disc space-y-2 text-base text-slate-700">
                <li>
                  <strong>90-day limit:</strong> You can spend up to 90 days in the Schengen Area within any 180-day period.
                </li>
                <li>
                  <strong>Rolling window:</strong> The 180-day period is calculated backwards from each day you want to enter or stay. It&apos;s not a fixed calendar period.
                </li>
                <li>
                  <strong>Entry and exit days count:</strong> Both the day you arrive and the day you leave count as full days in the Schengen Area.
                </li>
                <li>
                  <strong>All Schengen countries count together:</strong> Days spent in any Schengen country count toward your total (Germany, France, Spain, Italy, etc.).
                </li>
              </ul>
              <p className="mt-4 text-base leading-relaxed text-slate-700">
                Overstaying can result in fines, entry bans, and complications for future travel. For businesses, non-compliance can disrupt operations and create legal liability.
              </p>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-semibold text-slate-900">Who We Help</h2>
              <p className="mt-4 text-base leading-relaxed text-slate-700">
                ComplyEur is built for UK businesses that need to track employee travel to the EU:
              </p>
              <ul className="mt-4 ml-6 list-disc space-y-2 text-base text-slate-700">
                <li>
                  <strong>Professional services firms</strong> with consultants working on EU client sites
                </li>
                <li>
                  <strong>Tech companies</strong> with developers or engineers visiting EU offices
                </li>
                <li>
                  <strong>Sales teams</strong> regularly attending meetings and events across Europe
                </li>
                <li>
                  <strong>Manufacturing and logistics</strong> businesses with EU supply chain operations
                </li>
                <li>
                  <strong>Any UK employer</strong> with staff who travel to the Schengen Area for work
                </li>
              </ul>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-semibold text-slate-900">How ComplyEur Works</h2>
              <p className="mt-4 text-base leading-relaxed text-slate-700">
                Our platform makes compliance tracking straightforward:
              </p>
              <ul className="mt-4 ml-6 list-disc space-y-2 text-base text-slate-700">
                <li>
                  <strong>Add employees:</strong> Create profiles for each team member who travels to the EU.
                </li>
                <li>
                  <strong>Log trips:</strong> Record travel dates and destinations. Import from spreadsheets or enter manually.
                </li>
                <li>
                  <strong>Track compliance:</strong> See at a glance how many days each employee has used and how many remain in their current 180-day window.
                </li>
                <li>
                  <strong>Get alerts:</strong> Receive notifications when employees are approaching their 90-day limit.
                </li>
                <li>
                  <strong>Plan ahead:</strong> Check future travel dates against the rolling window before booking trips.
                </li>
              </ul>
            </section>

            <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
              <h3 className="text-lg font-semibold text-amber-900">Important Notice</h3>
              <p className="mt-3 text-base leading-relaxed text-amber-800">
                ComplyEur is a compliance tracking tool, not a legal service. While we strive for accuracy, the calculations provided are for informational purposes only. We recommend consulting with immigration professionals for specific legal advice. ComplyEur is not responsible for any consequences arising from travel decisions based on our platform. Always verify compliance requirements with relevant authorities before traveling.
              </p>
            </section>
          </div>

          <section className="mt-10 rounded-2xl border border-brand-200/80 bg-brand-50/70 p-6">
            <h2 className="text-xl font-semibold text-slate-900">Want to see how this fits your team?</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              We can walk through your travel profile and suggest a practical rollout approach.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href="/contact"
                className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-800"
              >
                Contact us
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-brand-300 hover:text-slate-900"
              >
                View pricing
              </Link>
            </div>
          </section>

          <section className="mt-10 border-t border-slate-200 pt-8">
            <h2 className="text-lg font-semibold text-slate-900">Learn More</h2>
            <div className="mt-4 flex flex-wrap gap-4 text-sm">
              <Link href="/faq" className="font-medium text-brand-700 hover:underline">
                FAQ
              </Link>
              <Link href="/contact" className="font-medium text-brand-700 hover:underline">
                Contact
              </Link>
              <Link href="/terms" className="font-medium text-brand-700 hover:underline">
                Terms
              </Link>
              <Link href="/privacy" className="font-medium text-brand-700 hover:underline">
                Privacy
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
