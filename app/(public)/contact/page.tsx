import Link from 'next/link'

export default function ContactPage() {
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
            <Link href="/landing" className="text-sm font-semibold text-brand-700 hover:underline">
              Back to landing
            </Link>
            <p className="mt-5 inline-flex items-center rounded-full border border-brand-200 bg-brand-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-brand-700">
              Contact
            </p>
            <h1 className="landing-serif mt-4 text-balance text-4xl font-semibold leading-tight text-slate-900 sm:text-5xl">
              Contact Us
            </h1>
            <p className="mt-4 text-base leading-relaxed text-slate-600 sm:text-lg">
              Have questions about ComplyEur or need help with your account? We&apos;re here to help with setup, support, and compliance workflows.
            </p>
            <p className="mt-4 text-sm text-slate-500">
              You can also review our <Link href="/faq" className="font-medium text-brand-700 hover:underline">FAQ</Link> or compare plans on <Link href="/pricing" className="font-medium text-brand-700 hover:underline">pricing</Link>.
            </p>
          </div>

          <div className="mt-10 space-y-8">
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-semibold text-slate-900">Get in Touch</h2>
              <p className="mt-4 text-base leading-relaxed text-slate-600">
                Choose the contact channel that matches your enquiry. We monitor all inboxes during UK business hours and aim to respond within one to two working days.
              </p>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                  <h3 className="text-lg font-semibold text-slate-900">General Enquiries</h3>
                  <p className="mt-2 text-sm text-slate-600">
                    Questions about features, pricing plans, implementation timelines, or product fit.
                  </p>
                  <a
                    href="mailto:hello@complyeur.com"
                    className="mt-3 inline-block text-sm font-semibold text-brand-700 hover:underline"
                  >
                    hello@complyeur.com
                  </a>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                  <h3 className="text-lg font-semibold text-slate-900">Customer Support</h3>
                  <p className="mt-2 text-sm text-slate-600">
                    Technical issues, account access, data import assistance, or workflow guidance.
                  </p>
                  <a
                    href="mailto:support@complyeur.com"
                    className="mt-3 inline-block text-sm font-semibold text-brand-700 hover:underline"
                  >
                    support@complyeur.com
                  </a>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                  <h3 className="text-lg font-semibold text-slate-900">Privacy Requests</h3>
                  <p className="mt-2 text-sm text-slate-600">
                    GDPR requests including access, correction, deletion, or portability.
                  </p>
                  <a
                    href="mailto:privacy@complyeur.com"
                    className="mt-3 inline-block text-sm font-semibold text-brand-700 hover:underline"
                  >
                    privacy@complyeur.com
                  </a>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                  <h3 className="text-lg font-semibold text-slate-900">Partnerships</h3>
                  <p className="mt-2 text-sm text-slate-600">
                    Integration opportunities, reseller discussions, or strategic collaboration.
                  </p>
                  <a
                    href="mailto:partnerships@complyeur.com"
                    className="mt-3 inline-block text-sm font-semibold text-brand-700 hover:underline"
                  >
                    partnerships@complyeur.com
                  </a>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-semibold text-slate-900">Response Times</h2>
              <p className="mt-4 text-base leading-relaxed text-slate-700">
                We aim to respond to all enquiries within 1-2 business days. For urgent support issues affecting your ability to use the platform, include &quot;URGENT&quot; in your email subject line.
              </p>
              <p className="mt-4 text-base leading-relaxed text-slate-700">
                Support hours are Monday to Friday, 9am to 5pm GMT, excluding UK bank holidays.
              </p>
            </section>

            <section className="rounded-2xl border border-brand-200 bg-brand-50/60 p-6">
              <h2 className="text-xl font-semibold text-slate-900">Existing Customers</h2>
              <p className="mt-3 text-base leading-relaxed text-slate-700">
                If you already have a ComplyEur account, the fastest route is through the support options inside your dashboard.
              </p>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-semibold text-slate-900">Company Information</h2>
              <p className="mt-4 text-base leading-relaxed text-slate-700">
                ComplyEur is a UK-based company focused on helping businesses navigate post-Brexit travel compliance requirements.
              </p>
              <ul className="mt-4 ml-6 list-disc space-y-2 text-base text-slate-700">
                <li>
                  <strong>Registered in:</strong> England and Wales
                </li>
                <li>
                  <strong>Website:</strong>{' '}
                  <a href="https://complyeur.com" className="font-medium text-brand-700 hover:underline">
                    complyeur.com
                  </a>
                </li>
              </ul>
            </section>
          </div>

          <section className="mt-10 rounded-2xl border border-brand-200/80 bg-brand-50/70 p-6">
            <h2 className="text-xl font-semibold text-slate-900">Need immediate clarity before a trip is approved?</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Share your scenario and we will point you to the right product workflow quickly.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <a
                href="mailto:support@complyeur.com"
                className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-800"
              >
                Email support
              </a>
              <Link
                href="/faq"
                className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-brand-300 hover:text-slate-900"
              >
                Browse FAQ
              </Link>
            </div>
          </section>

          <section className="mt-10 border-t border-slate-200 pt-8">
            <h2 className="text-lg font-semibold text-slate-900">Related Pages</h2>
            <div className="mt-4 flex flex-wrap gap-4 text-sm">
              <Link href="/about" className="font-medium text-brand-700 hover:underline">
                About
              </Link>
              <Link href="/privacy" className="font-medium text-brand-700 hover:underline">
                Privacy
              </Link>
              <Link href="/terms" className="font-medium text-brand-700 hover:underline">
                Terms
              </Link>
              <Link href="/pricing" className="font-medium text-brand-700 hover:underline">
                Pricing
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
