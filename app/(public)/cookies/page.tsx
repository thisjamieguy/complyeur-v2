'use client'

import Link from 'next/link'

export default function CookiePolicyPage() {
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
              Cookies
            </p>
            <h1 className="landing-serif mt-4 text-balance text-4xl font-semibold leading-tight text-slate-900 sm:text-5xl">
              Cookie Policy
            </h1>
            <p className="mt-3 text-sm text-slate-500">Last updated: 30 March 2026</p>
            <p className="mt-4 text-base leading-relaxed text-slate-600 sm:text-lg">
              This policy explains what cookies we set, why we set them, and how to manage your preferences.
            </p>
            <p className="mt-4 text-sm text-slate-500">
              See also our{' '}
              <Link href="/privacy" className="font-medium text-brand-700 hover:underline">Privacy Policy</Link>
              {' '}for how we handle personal data more broadly.
            </p>
          </div>

          <div className="mt-10 space-y-8">

            {/* 1. What are cookies */}
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-semibold text-slate-900 mb-4">1. What Are Cookies</h2>
              <p className="text-base text-slate-700 leading-relaxed">
                Cookies are small text files placed on your device when you visit a website. They allow the
                site to remember information about your visit — such as whether you are logged in — and
                help the site work correctly.
              </p>
              <p className="text-base text-slate-700 leading-relaxed mt-4">
                We also use similar technologies including local storage and pixel tags where referenced
                below. Throughout this policy, &quot;cookies&quot; refers to all of these technologies unless
                stated otherwise.
              </p>
            </section>

            {/* 2. Cookie consent */}
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-semibold text-slate-900 mb-4">2. Your Consent</h2>
              <p className="text-base text-slate-700 leading-relaxed">
                When you first visit ComplyEUR, a cookie banner managed by{' '}
                <strong>CookieYes</strong> asks for your consent to non-essential cookies. You can:
              </p>
              <ul className="text-base text-slate-700 ml-6 list-disc space-y-2 mt-4">
                <li>Accept all cookies</li>
                <li>Reject all non-essential cookies</li>
                <li>Customise your preferences by category</li>
              </ul>
              <p className="text-base text-slate-700 leading-relaxed mt-4">
                You can change your preferences at any time by clicking{' '}
                <button
                  type="button"
                  onClick={() => {
                    if (typeof window !== 'undefined' && window.cookieyes) {
                      window.cookieyes.showSettingsPopup()
                    }
                  }}
                  className="font-medium text-brand-700 hover:underline"
                >
                  Cookie Settings
                </button>
                .
              </p>
              <p className="text-base text-slate-700 leading-relaxed mt-4">
                Withdrawing consent does not affect the lawfulness of any processing carried out before
                withdrawal.
              </p>
            </section>

            {/* 3. Necessary cookies */}
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-semibold text-slate-900 mb-4">3. Strictly Necessary Cookies</h2>
              <p className="text-base text-slate-700 leading-relaxed">
                These cookies are essential for ComplyEUR to function. They cannot be disabled. No
                consent is required under the PECR / ePrivacy Directive exemption for cookies that are
                strictly necessary to provide a service explicitly requested by the user.
              </p>

              <div className="mt-6 overflow-x-auto">
                <table className="w-full text-sm text-slate-700 border border-slate-200 rounded-lg overflow-hidden">
                  <thead className="bg-slate-50 text-slate-900 font-semibold">
                    <tr>
                      <th className="text-left px-4 py-3 border-b border-slate-200">Cookie</th>
                      <th className="text-left px-4 py-3 border-b border-slate-200">Set by</th>
                      <th className="text-left px-4 py-3 border-b border-slate-200">Purpose</th>
                      <th className="text-left px-4 py-3 border-b border-slate-200">Expiry</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="px-4 py-3 font-mono text-xs">sb-*-auth-token</td>
                      <td className="px-4 py-3">Supabase</td>
                      <td className="px-4 py-3">Authentication session. Keeps you logged in to your account.</td>
                      <td className="px-4 py-3">Session / 1 week</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-mono text-xs">sb-*-auth-token-code-verifier</td>
                      <td className="px-4 py-3">Supabase</td>
                      <td className="px-4 py-3">PKCE code verifier used during OAuth sign-in flow.</td>
                      <td className="px-4 py-3">Session</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-mono text-xs">cookieyes-consent</td>
                      <td className="px-4 py-3">CookieYes</td>
                      <td className="px-4 py-3">Stores your cookie consent preferences so the banner does not reappear.</td>
                      <td className="px-4 py-3">1 year</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* 4. Analytics cookies */}
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-semibold text-slate-900 mb-4">4. Analytics Cookies</h2>
              <p className="text-base text-slate-700 leading-relaxed">
                These cookies help us understand how visitors interact with ComplyEUR. All analytics data
                is processed only with your consent. If you decline analytics cookies, these will not
                be set and no analytics data about your visit will be collected.
              </p>

              <div className="mt-6 overflow-x-auto">
                <table className="w-full text-sm text-slate-700 border border-slate-200 rounded-lg overflow-hidden">
                  <thead className="bg-slate-50 text-slate-900 font-semibold">
                    <tr>
                      <th className="text-left px-4 py-3 border-b border-slate-200">Cookie</th>
                      <th className="text-left px-4 py-3 border-b border-slate-200">Set by</th>
                      <th className="text-left px-4 py-3 border-b border-slate-200">Purpose</th>
                      <th className="text-left px-4 py-3 border-b border-slate-200">Expiry</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="px-4 py-3 font-mono text-xs">_ga</td>
                      <td className="px-4 py-3">Google Analytics 4</td>
                      <td className="px-4 py-3">Distinguishes unique users. Used to calculate visitor, session, and campaign data for site analytics.</td>
                      <td className="px-4 py-3">2 years</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-mono text-xs">_ga_*</td>
                      <td className="px-4 py-3">Google Analytics 4</td>
                      <td className="px-4 py-3">Persists session state for GA4.</td>
                      <td className="px-4 py-3">2 years</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <p className="text-sm text-slate-500 mt-4">
                Google Analytics data is processed by Google LLC. For more information, see{' '}
                <a
                  href="https://policies.google.com/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-700 hover:underline"
                >
                  Google&apos;s Privacy Policy
                </a>
                . IP anonymisation is enabled.
              </p>
            </section>

            {/* 5. Functional cookies */}
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-semibold text-slate-900 mb-4">5. Functional Cookies (Third-Party Services)</h2>
              <p className="text-base text-slate-700 leading-relaxed">
                Some third-party services we use may set their own cookies. These are described below.
              </p>

              <div className="mt-6 overflow-x-auto">
                <table className="w-full text-sm text-slate-700 border border-slate-200 rounded-lg overflow-hidden">
                  <thead className="bg-slate-50 text-slate-900 font-semibold">
                    <tr>
                      <th className="text-left px-4 py-3 border-b border-slate-200">Service</th>
                      <th className="text-left px-4 py-3 border-b border-slate-200">Purpose</th>
                      <th className="text-left px-4 py-3 border-b border-slate-200">Cookie / Storage</th>
                      <th className="text-left px-4 py-3 border-b border-slate-200">Privacy Policy</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="px-4 py-3 font-medium">Stripe</td>
                      <td className="px-4 py-3">Payment processing. Set only on checkout pages.</td>
                      <td className="px-4 py-3 font-mono text-xs">__stripe_mid, __stripe_sid</td>
                      <td className="px-4 py-3">
                        <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer" className="text-brand-700 hover:underline">stripe.com/privacy</a>
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-medium">Sentry</td>
                      <td className="px-4 py-3">Error tracking. Helps us identify and fix application errors. No personal data is intentionally sent to Sentry.</td>
                      <td className="px-4 py-3 font-mono text-xs">No persistent cookies; session replay is disabled.</td>
                      <td className="px-4 py-3">
                        <a href="https://sentry.io/privacy/" target="_blank" rel="noopener noreferrer" className="text-brand-700 hover:underline">sentry.io/privacy</a>
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3 font-medium">Cloudflare Turnstile</td>
                      <td className="px-4 py-3">CAPTCHA / bot protection on sign-up and waitlist forms.</td>
                      <td className="px-4 py-3 font-mono text-xs">cf_clearance (where set by Cloudflare)</td>
                      <td className="px-4 py-3">
                        <a href="https://www.cloudflare.com/privacypolicy/" target="_blank" rel="noopener noreferrer" className="text-brand-700 hover:underline">cloudflare.com/privacypolicy</a>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* 6. How to manage cookies */}
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-semibold text-slate-900 mb-4">6. How to Manage Cookies</h2>

              <h3 className="text-xl font-semibold text-slate-900 mt-4 mb-3">Through our cookie banner</h3>
              <p className="text-base text-slate-700 leading-relaxed">
                Use the{' '}
                <button
                  type="button"
                  onClick={() => {
                    if (typeof window !== 'undefined' && window.cookieyes) {
                      window.cookieyes.showSettingsPopup()
                    }
                  }}
                  className="font-medium text-brand-700 hover:underline"
                >
                  Cookie Settings
                </button>
                {' '}panel to accept, reject, or customise cookie categories at any time.
              </p>

              <h3 className="text-xl font-semibold text-slate-900 mt-6 mb-3">Through your browser</h3>
              <p className="text-base text-slate-700 leading-relaxed">
                Most browsers allow you to refuse or delete cookies through their settings.
                Note that disabling all cookies will affect site functionality, including the ability
                to sign in. Browser-level cookie blocking overrides our consent settings.
              </p>
              <ul className="text-base text-slate-700 ml-6 list-disc space-y-2 mt-4">
                <li>Chrome: Settings → Privacy and Security → Cookies</li>
                <li>Firefox: Settings → Privacy and Security → Cookies and Site Data</li>
                <li>Safari: Preferences → Privacy → Manage Website Data</li>
                <li>Edge: Settings → Cookies and Site Permissions</li>
              </ul>

              <h3 className="text-xl font-semibold text-slate-900 mt-6 mb-3">Opt out of Google Analytics</h3>
              <p className="text-base text-slate-700 leading-relaxed">
                To opt out of Google Analytics across all websites, install the{' '}
                <a
                  href="https://tools.google.com/dlpage/gaoptout"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-brand-700 hover:underline"
                >
                  Google Analytics Opt-out Browser Add-on
                </a>
                .
              </p>
            </section>

            {/* 7. Changes */}
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-semibold text-slate-900 mb-4">7. Changes to This Policy</h2>
              <p className="text-base text-slate-700 leading-relaxed">
                We may update this Cookie Policy to reflect changes in the cookies we use or for
                operational, legal, or regulatory reasons. We will update the &quot;Last updated&quot; date
                at the top of this page when we do so. We recommend reviewing this page periodically.
              </p>
            </section>

            {/* 8. Contact */}
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-semibold text-slate-900 mb-4">8. Contact Us</h2>
              <p className="text-base text-slate-700 leading-relaxed">
                If you have questions about our use of cookies or other tracking technologies, please
                contact us:
              </p>
              <ul className="text-base text-slate-700 ml-6 list-disc space-y-2 mt-4">
                <li>
                  <strong>Email:</strong>{' '}
                  <a href="mailto:privacy@complyeur.com" className="font-medium text-brand-700 hover:underline">
                    privacy@complyeur.com
                  </a>
                </li>
              </ul>
            </section>

          </div>

          <section className="mt-10 border-t border-slate-200 pt-8">
            <h2 className="text-lg font-semibold text-slate-900">Related Documents</h2>
            <div className="mt-4 flex flex-wrap gap-4 text-sm">
              <Link href="/privacy" className="font-medium text-brand-700 hover:underline">
                Privacy Policy
              </Link>
              <Link href="/terms" className="font-medium text-brand-700 hover:underline">
                Terms of Service
              </Link>
              <Link href="/accessibility" className="font-medium text-brand-700 hover:underline">
                Accessibility
              </Link>
            </div>
          </section>

        </div>
      </div>
    </div>
  )
}
