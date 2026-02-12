import Link from 'next/link'

export default function TermsPage() {
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
              Terms
            </p>
            <h1 className="landing-serif mt-4 text-balance text-4xl font-semibold leading-tight text-slate-900 sm:text-5xl">
              Terms of Service
            </h1>
            <p className="mt-3 text-sm text-slate-500">Last updated: February 6, 2026</p>
            <p className="mt-4 text-base leading-relaxed text-slate-600 sm:text-lg">
              These terms govern access to and use of ComplyEur. They outline account responsibilities, billing conditions, and liability boundaries.
            </p>
            <p className="mt-4 text-sm text-slate-500">
              You may also want to review our <Link href="/privacy" className="font-medium text-brand-700 hover:underline">Privacy Policy</Link> and <Link href="/contact" className="font-medium text-brand-700 hover:underline">Contact</Link> page.
            </p>
          </div>

          <div className="mt-10 space-y-8">
        {/* 1. Acceptance of Terms */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-semibold text-slate-900 mb-4">1. Acceptance of Terms</h2>
          <p className="text-base text-slate-700 leading-relaxed">
            By accessing or using ComplyEur (&quot;the Service&quot;), you agree to be bound by these
            Terms of Service (&quot;Terms&quot;). If you do not agree to these Terms, you may not
            access or use the Service.
          </p>
          <p className="text-base text-slate-700 leading-relaxed mt-4">
            These Terms constitute a legally binding agreement between you (either an individual
            or a legal entity) and ComplyEur. By creating an account, you represent that you have
            the authority to enter into this agreement on behalf of yourself or your organization.
          </p>
        </section>

        {/* 2. Description of Service */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-semibold text-slate-900 mb-4">2. Description of Service</h2>
          <p className="text-base text-slate-700 leading-relaxed">
            ComplyEur is a software-as-a-service (SaaS) platform that helps businesses track and
            manage employee travel compliance with EU Schengen 90/180-day visa rules.
          </p>

          <h3 className="text-xl font-semibold text-slate-900 mb-3">What ComplyEur Does</h3>
          <ul className="text-base text-slate-700 ml-6 list-disc space-y-2">
            <li>Tracks employee travel dates within the Schengen Area</li>
            <li>Calculates days spent in the Schengen zone based on the 90/180-day rolling window</li>
            <li>Provides compliance alerts and notifications</li>
            <li>Generates reports for compliance management</li>
            <li>Offers tools for planning future travel within compliance limits</li>
          </ul>

          <h3 className="text-xl font-semibold text-slate-900 mb-3">What ComplyEur Does NOT Do</h3>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-4">
            <p className="text-base text-amber-800 font-medium">
              Important Disclaimer
            </p>
            <p className="text-base text-amber-700 mt-2">
              ComplyEur is a compliance tracking tool only. It does NOT provide legal advice,
              immigration consulting, or visa application services. The information provided
              by the Service is for informational purposes only and should not be relied upon
              as legal advice. For specific immigration or visa questions, please consult a
              qualified immigration attorney or relevant authorities.
            </p>
          </div>
        </section>

        {/* 3. User Accounts and Responsibilities */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-semibold text-slate-900 mb-4">3. User Accounts and Responsibilities</h2>
          <p className="text-base text-slate-700 leading-relaxed">
            To use the Service, you must create an account. You are responsible for:
          </p>
          <ul className="text-base text-slate-700 ml-6 list-disc space-y-2 mt-4">
            <li>Providing accurate and complete registration information</li>
            <li>Maintaining the security of your account credentials</li>
            <li>All activities that occur under your account</li>
            <li>Notifying us immediately of any unauthorized access or use</li>
            <li>Ensuring that employee data entered into the Service is accurate and up-to-date</li>
            <li>Complying with all applicable laws and regulations in your jurisdiction</li>
          </ul>
          <p className="text-base text-slate-700 leading-relaxed mt-4">
            You must be at least 18 years old to use the Service. By using the Service, you
            represent and warrant that you meet this age requirement.
          </p>
        </section>

        {/* 4. Data Accuracy Disclaimer */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-semibold text-slate-900 mb-4">4. Data Accuracy Disclaimer</h2>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-base text-red-800 font-medium">
              Critical Notice Regarding Data Accuracy
            </p>
            <p className="text-base text-red-700 mt-2">
              The accuracy of compliance calculations depends entirely on the accuracy of
              travel data you enter into the Service. ComplyEur cannot verify the accuracy
              of user-provided data and is not responsible for any errors, omissions, or
              inaccuracies in the data you provide.
            </p>
            <p className="text-base text-red-700 mt-2">
              <strong>ComplyEur is not liable for any visa violations, fines, penalties,
              or other consequences resulting from incorrect data entry or reliance on
              the Service&apos;s calculations.</strong> It is your responsibility to verify
              all compliance information with relevant immigration authorities.
            </p>
          </div>
        </section>

        {/* 5. Subscription and Payment */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-semibold text-slate-900 mb-4">5. Subscription and Payment</h2>
          <p className="text-base text-slate-700 leading-relaxed">
            ComplyEur offers subscription-based access to the Service. By subscribing:
          </p>
          <ul className="text-base text-slate-700 ml-6 list-disc space-y-2 mt-4">
            <li>You agree to pay the subscription fees at the rates in effect at the time of purchase</li>
            <li>You may choose either monthly or annual billing cycles</li>
            <li>Annual subscriptions are billed upfront and renew annually unless cancelled before renewal</li>
            <li>Subscriptions automatically renew unless cancelled before the renewal date</li>
            <li>Payment is processed securely through Stripe, our payment processor</li>
            <li>All prices are listed in GBP and are exclusive of applicable taxes, which you are responsible for paying</li>
            <li>We reserve the right to change pricing with 30 days&apos; notice before your next billing cycle</li>
          </ul>
        </section>

        {/* 6. Refund Policy */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-semibold text-slate-900 mb-4">6. Refund Policy</h2>
          <p className="text-base text-slate-700 leading-relaxed">
            We offer a <strong>14-day money-back guarantee</strong> for new subscriptions:
          </p>
          <ul className="text-base text-slate-700 ml-6 list-disc space-y-2 mt-4">
            <li>You may request a full refund within 14 days of your initial subscription purchase</li>
            <li>Refund requests must be submitted to <a href="mailto:support@complyeur.com" className="font-medium text-brand-700 hover:underline">support@complyeur.com</a></li>
            <li>Refunds will be processed within 5-10 business days</li>
            <li>After the 14-day period, fees are non-refundable</li>
            <li>Renewal payments are not eligible for the money-back guarantee</li>
          </ul>
        </section>

        {/* 7. Limitation of Liability */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-semibold text-slate-900 mb-4">7. Limitation of Liability</h2>
          <p className="text-base text-slate-700 leading-relaxed">
            TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW:
          </p>
          <ul className="text-base text-slate-700 ml-6 list-disc space-y-2 mt-4">
            <li>
              <strong>The Service is provided &quot;as is&quot; and &quot;as available&quot;</strong>
              without warranties of any kind, either express or implied, including but not
              limited to merchantability, fitness for a particular purpose, and non-infringement.
            </li>
            <li>
              We do not warrant that the Service will be uninterrupted, secure, or error-free.
            </li>
            <li>
              <strong>ComplyEur shall not be liable for any indirect, incidental, special,
              consequential, or punitive damages</strong>, including but not limited to loss
              of profits, data, business opportunities, or goodwill.
            </li>
            <li>
              <strong>Our maximum aggregate liability</strong> for any claims arising from
              or related to the Service shall not exceed the total amount of subscription
              fees paid by you to ComplyEur in the twelve (12) months preceding the claim.
            </li>
          </ul>
          <p className="text-base text-slate-700 leading-relaxed mt-4">
            Some jurisdictions do not allow the exclusion or limitation of certain damages,
            so some of the above limitations may not apply to you.
          </p>
        </section>

        {/* 8. Intellectual Property */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-semibold text-slate-900 mb-4">8. Intellectual Property</h2>

          <h3 className="text-xl font-semibold text-slate-900 mb-3">Our Intellectual Property</h3>
          <p className="text-base text-slate-700 leading-relaxed">
            The Service, including all content, features, functionality, software, code,
            designs, and branding (collectively, &quot;ComplyEur IP&quot;), is owned by ComplyEur
            and protected by copyright, trademark, and other intellectual property laws.
            You may not copy, modify, distribute, sell, or lease any part of the Service
            without our prior written consent.
          </p>

          <h3 className="text-xl font-semibold text-slate-900 mb-3">Your Data</h3>
          <p className="text-base text-slate-700 leading-relaxed">
            You retain all ownership rights to the data you enter into the Service. By using
            the Service, you grant us a limited license to store, process, and display your
            data solely for the purpose of providing the Service to you.
          </p>
        </section>

        {/* 9. Termination */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-semibold text-slate-900 mb-4">9. Termination</h2>

          <h3 className="text-xl font-semibold text-slate-900 mb-3">Termination by You</h3>
          <p className="text-base text-slate-700 leading-relaxed">
            You may cancel your subscription and terminate your account at any time through
            your account settings. Upon cancellation:
          </p>
          <ul className="text-base text-slate-700 ml-6 list-disc space-y-2 mt-4">
            <li>You will retain access until the end of your current billing period</li>
            <li>For annual plans, cancellation stops renewal and access remains until the end of the paid annual term</li>
            <li>No refunds will be provided for partial billing periods</li>
            <li>You can export your data before your access ends</li>
            <li>After cancellation, your data will be subject to our data retention policy</li>
          </ul>

          <h3 className="text-xl font-semibold text-slate-900 mb-3">Termination by ComplyEur</h3>
          <p className="text-base text-slate-700 leading-relaxed">
            We reserve the right to suspend or terminate your access to the Service if:
          </p>
          <ul className="text-base text-slate-700 ml-6 list-disc space-y-2 mt-4">
            <li>You violate these Terms of Service</li>
            <li>You fail to pay subscription fees when due</li>
            <li>We are required to do so by law</li>
            <li>We discontinue the Service (with reasonable notice)</li>
          </ul>
        </section>

        {/* 10. Changes to Terms */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-semibold text-slate-900 mb-4">10. Changes to Terms</h2>
          <p className="text-base text-slate-700 leading-relaxed">
            We may modify these Terms from time to time. When we make changes:
          </p>
          <ul className="text-base text-slate-700 ml-6 list-disc space-y-2 mt-4">
            <li>We will update the &quot;Last updated&quot; date at the top of this page</li>
            <li>For material changes, we will notify you via email at least 30 days in advance</li>
            <li>Your continued use of the Service after changes take effect constitutes acceptance</li>
            <li>If you do not agree to the new terms, you must stop using the Service</li>
          </ul>
        </section>

        {/* 11. Governing Law */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-semibold text-slate-900 mb-4">11. Governing Law</h2>
          <p className="text-base text-slate-700 leading-relaxed">
            These Terms shall be governed by and construed in accordance with the laws of
            England and Wales, without regard to its conflict of law provisions.
          </p>
          <p className="text-base text-slate-700 leading-relaxed mt-4">
            Any disputes arising from or relating to these Terms or the Service shall be
            subject to the exclusive jurisdiction of the courts of England and Wales.
          </p>
          <p className="text-base text-slate-700 leading-relaxed mt-4">
            If any provision of these Terms is found to be unenforceable, the remaining
            provisions will continue in full force and effect.
          </p>
        </section>

        {/* 12. Contact Us */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-semibold text-slate-900 mb-4">12. Contact Us</h2>
          <p className="text-base text-slate-700 leading-relaxed">
            If you have any questions about these Terms of Service, please contact us:
          </p>
          <ul className="text-base text-slate-700 ml-6 list-disc space-y-2 mt-4">
            <li>
              <strong>Email:</strong>{' '}
              <a href="mailto:legal@complyeur.com" className="font-medium text-brand-700 hover:underline">
                legal@complyeur.com
              </a>
            </li>
            <li>
              <strong>Support:</strong>{' '}
              <a href="mailto:support@complyeur.com" className="font-medium text-brand-700 hover:underline">
                support@complyeur.com
              </a>
            </li>
          </ul>
        </section>

          </div>

          <section className="mt-10 rounded-2xl border border-brand-200/80 bg-brand-50/70 p-6">
            <h2 className="text-xl font-semibold text-slate-900">Need clarification on a contract or billing clause?</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              Reach out and we can direct you to legal or support contacts based on your request.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <a
                href="mailto:legal@complyeur.com"
                className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-800"
              >
                Email legal
              </a>
              <Link
                href="/contact"
                className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-brand-300 hover:text-slate-900"
              >
                Contact page
              </Link>
            </div>
          </section>

          <section className="mt-10 border-t border-slate-200 pt-8">
            <h2 className="text-lg font-semibold text-slate-900">Related Documents</h2>
            <div className="mt-4 flex flex-wrap gap-4 text-sm">
              <Link href="/privacy" className="font-medium text-brand-700 hover:underline">
                Privacy
              </Link>
              <Link href="/accessibility" className="font-medium text-brand-700 hover:underline">
                Accessibility
              </Link>
              <Link href="/contact" className="font-medium text-brand-700 hover:underline">
                Contact
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
