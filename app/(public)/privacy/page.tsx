'use client'

import Link from 'next/link'

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold text-slate-900 mb-2">Privacy Policy</h1>
      <p className="text-sm text-slate-500 mb-12">Last updated: January 9, 2025</p>

      <div className="prose prose-slate max-w-none">
        {/* 1. Introduction */}
        <section>
          <h2 className="text-2xl font-semibold text-slate-900 mt-12 mb-4">1. Introduction</h2>
          <p className="text-base text-slate-700 leading-relaxed">
            ComplyEUR (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is committed to protecting your privacy.
            This Privacy Policy explains how we collect, use, disclose, and safeguard your information
            when you use our Schengen compliance management service.
          </p>
          <p className="text-base text-slate-700 leading-relaxed mt-4">
            By using ComplyEUR, you agree to the collection and use of information in accordance with
            this policy. If you do not agree with the terms of this policy, please do not access or use our service.
          </p>
        </section>

        {/* 2. Information We Collect */}
        <section>
          <h2 className="text-2xl font-semibold text-slate-900 mt-12 mb-4">2. Information We Collect</h2>
          <p className="text-base text-slate-700 leading-relaxed">
            We collect information that you provide directly to us when using our service:
          </p>

          <h3 className="text-xl font-semibold text-slate-900 mt-8 mb-3">Account Information</h3>
          <ul className="text-base text-slate-700 ml-6 list-disc space-y-2">
            <li>Email addresses</li>
            <li>Company names</li>
            <li>User names and contact details</li>
          </ul>

          <h3 className="text-xl font-semibold text-slate-900 mt-8 mb-3">Employee Data</h3>
          <ul className="text-base text-slate-700 ml-6 list-disc space-y-2">
            <li>Employee names</li>
            <li>Passport numbers (encrypted at rest)</li>
            <li>Nationality information</li>
            <li>Travel dates and destinations</li>
          </ul>

          <h3 className="text-xl font-semibold text-slate-900 mt-8 mb-3">Technical Information</h3>
          <ul className="text-base text-slate-700 ml-6 list-disc space-y-2">
            <li>Browser type and version</li>
            <li>Device information</li>
            <li>IP address</li>
            <li>Usage patterns and analytics data</li>
          </ul>
        </section>

        {/* 3. How We Use Your Information */}
        <section>
          <h2 className="text-2xl font-semibold text-slate-900 mt-12 mb-4">3. How We Use Your Information</h2>
          <p className="text-base text-slate-700 leading-relaxed">
            We use the information we collect solely to provide and improve our Schengen compliance
            tracking service. Specifically, we use your information to:
          </p>
          <ul className="text-base text-slate-700 ml-6 list-disc space-y-2 mt-4">
            <li>Calculate and track Schengen 90/180-day visa compliance for your employees</li>
            <li>Send compliance alerts and notifications</li>
            <li>Process payments for subscription services</li>
            <li>Provide customer support</li>
            <li>Improve our service through analytics</li>
            <li>Communicate important updates about our service</li>
          </ul>
          <p className="text-base text-slate-700 leading-relaxed mt-4 font-medium">
            We do not sell, rent, or share your personal data with third parties for marketing purposes.
          </p>
        </section>

        {/* 4. Data Sharing and Third Parties */}
        <section>
          <h2 className="text-2xl font-semibold text-slate-900 mt-12 mb-4">4. Data Sharing and Third Parties</h2>
          <p className="text-base text-slate-700 leading-relaxed">
            We work with trusted third-party service providers who assist us in operating our service.
            These providers have access to your data only to perform specific tasks on our behalf and
            are obligated to protect your information.
          </p>

          <h3 className="text-xl font-semibold text-slate-900 mt-8 mb-3">Our Service Providers</h3>
          <ul className="text-base text-slate-700 ml-6 list-disc space-y-2">
            <li>
              <strong>Supabase</strong> - Database hosting and authentication services.
              Your data is stored securely in Supabase&apos;s infrastructure with encryption at rest.
            </li>
            <li>
              <strong>Stripe</strong> - Payment processing. Stripe handles all payment card data
              and is PCI DSS compliant. We do not store your full credit card details.
            </li>
            <li>
              <strong>Resend</strong> - Email delivery service for compliance alerts and notifications.
              Only email addresses and notification content are shared with Resend.
            </li>
            <li>
              <strong>Google Analytics</strong> - Website analytics to understand how users interact
              with our service. This data is anonymized and used only for service improvement.
            </li>
          </ul>
        </section>

        {/* 5. Data Retention */}
        <section>
          <h2 className="text-2xl font-semibold text-slate-900 mt-12 mb-4">5. Data Retention</h2>
          <p className="text-base text-slate-700 leading-relaxed">
            We retain your data for as long as necessary to provide our services and comply with
            legal obligations:
          </p>
          <ul className="text-base text-slate-700 ml-6 list-disc space-y-2 mt-4">
            <li>
              <strong>Active accounts:</strong> Your data is retained for as long as your account
              remains active.
            </li>
            <li>
              <strong>Account deletion:</strong> When you delete your account, your data enters a
              30-day soft deletion period during which you can recover your account. After this
              period, data is permanently deleted.
            </li>
            <li>
              <strong>Backups:</strong> Encrypted backups are retained for 90 days for disaster
              recovery purposes before being permanently deleted.
            </li>
            <li>
              <strong>Legal requirements:</strong> Some data may be retained longer if required
              by law or for legitimate business purposes (e.g., fraud prevention, tax records).
            </li>
          </ul>
        </section>

        {/* 6. Your Rights (GDPR/UK GDPR) */}
        <section>
          <h2 className="text-2xl font-semibold text-slate-900 mt-12 mb-4">6. Your Rights (GDPR/UK GDPR)</h2>
          <p className="text-base text-slate-700 leading-relaxed">
            If you are located in the European Economic Area (EEA) or United Kingdom, you have
            certain rights under the General Data Protection Regulation (GDPR) and UK GDPR:
          </p>
          <ul className="text-base text-slate-700 ml-6 list-disc space-y-2 mt-4">
            <li>
              <strong>Right to Access:</strong> You can request a copy of all personal data we
              hold about you. Use the &quot;Download My Data&quot; feature in your account settings.
            </li>
            <li>
              <strong>Right to Rectification:</strong> You can correct any inaccurate personal
              data through your account settings.
            </li>
            <li>
              <strong>Right to Erasure:</strong> You can delete your account and all associated
              data through the account settings. This initiates our 30-day soft deletion process.
            </li>
            <li>
              <strong>Right to Data Portability:</strong> You can export your data in CSV format
              using the &quot;Export Data&quot; feature.
            </li>
            <li>
              <strong>Right to Object:</strong> You can opt out of non-essential communications
              at any time via email preferences or the unsubscribe link in our emails.
            </li>
            <li>
              <strong>Right to Restrict Processing:</strong> You can request that we limit how
              we use your data in certain circumstances.
            </li>
          </ul>
          <p className="text-base text-slate-700 leading-relaxed mt-4">
            To exercise any of these rights, please contact us at{' '}
            <a href="mailto:privacy@complyeur.com" className="text-blue-600 hover:text-blue-700 underline">
              privacy@complyeur.com
            </a>.
          </p>
        </section>

        {/* 7. Cookies */}
        <section>
          <h2 className="text-2xl font-semibold text-slate-900 mt-12 mb-4">7. Cookies</h2>
          <p className="text-base text-slate-700 leading-relaxed">
            We use cookies and similar tracking technologies to operate our service and improve
            your experience. You can manage your cookie preferences at any time.
          </p>

          <h3 className="text-xl font-semibold text-slate-900 mt-8 mb-3">Types of Cookies We Use</h3>
          <ul className="text-base text-slate-700 ml-6 list-disc space-y-2">
            <li>
              <strong>Necessary Cookies:</strong> Essential for the operation of our service,
              including authentication and session management. These cannot be disabled.
            </li>
            <li>
              <strong>Analytics Cookies:</strong> Help us understand how visitors interact with
              our service. You can opt out of these cookies.
            </li>
          </ul>
          <p className="text-base text-slate-700 leading-relaxed mt-4">
            For more information about the cookies we use, please see our{' '}
            <button
              type="button"
              onClick={() => {
                if (typeof window !== 'undefined' && window.cookieyes) {
                  window.cookieyes.showSettingsPopup()
                }
              }}
              className="text-blue-600 hover:text-blue-700 underline"
            >
              Cookie Settings
            </button>
            .
          </p>
        </section>

        {/* 8. Security */}
        <section>
          <h2 className="text-2xl font-semibold text-slate-900 mt-12 mb-4">8. Security</h2>
          <p className="text-base text-slate-700 leading-relaxed">
            We take the security of your data seriously and implement appropriate technical and
            organizational measures to protect your personal information:
          </p>
          <ul className="text-base text-slate-700 ml-6 list-disc space-y-2 mt-4">
            <li>All data is encrypted in transit using TLS 1.3</li>
            <li>Sensitive data (such as passport numbers) is encrypted at rest</li>
            <li>Access to production systems is restricted and logged</li>
            <li>Regular security audits and vulnerability assessments</li>
            <li>Multi-factor authentication for administrative access</li>
          </ul>
          <p className="text-base text-slate-700 leading-relaxed mt-4">
            While we strive to protect your personal information, no method of transmission over
            the Internet or electronic storage is 100% secure. We cannot guarantee absolute security.
          </p>
        </section>

        {/* 9. Changes to This Policy */}
        <section>
          <h2 className="text-2xl font-semibold text-slate-900 mt-12 mb-4">9. Changes to This Policy</h2>
          <p className="text-base text-slate-700 leading-relaxed">
            We may update this Privacy Policy from time to time. We will notify you of any
            material changes by:
          </p>
          <ul className="text-base text-slate-700 ml-6 list-disc space-y-2 mt-4">
            <li>Posting the new Privacy Policy on this page</li>
            <li>Updating the &quot;Last updated&quot; date at the top of this page</li>
            <li>Sending an email notification for significant changes</li>
          </ul>
          <p className="text-base text-slate-700 leading-relaxed mt-4">
            We encourage you to review this Privacy Policy periodically for any changes.
            Your continued use of the service after changes are posted constitutes acceptance
            of those changes.
          </p>
        </section>

        {/* 10. Contact Us */}
        <section>
          <h2 className="text-2xl font-semibold text-slate-900 mt-12 mb-4">10. Contact Us</h2>
          <p className="text-base text-slate-700 leading-relaxed">
            If you have any questions about this Privacy Policy, your personal data, or wish
            to exercise your data protection rights, please contact us:
          </p>
          <ul className="text-base text-slate-700 ml-6 list-disc space-y-2 mt-4">
            <li>
              <strong>Email:</strong>{' '}
              <a href="mailto:privacy@complyeur.com" className="text-blue-600 hover:text-blue-700 underline">
                privacy@complyeur.com
              </a>
            </li>
            <li>
              <strong>Data Protection Officer:</strong>{' '}
              <a href="mailto:dpo@complyeur.com" className="text-blue-600 hover:text-blue-700 underline">
                dpo@complyeur.com
              </a>
            </li>
          </ul>
          <p className="text-base text-slate-700 leading-relaxed mt-4">
            We aim to respond to all legitimate requests within 30 days. If you are not
            satisfied with our response, you have the right to lodge a complaint with your
            local data protection authority.
          </p>
        </section>

        {/* Related Links */}
        <section className="mt-16 pt-8 border-t border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Related Documents</h2>
          <ul className="text-base text-slate-700 space-y-2">
            <li>
              <Link href="/terms" className="text-blue-600 hover:text-blue-700 underline">
                Terms of Service
              </Link>
            </li>
            <li>
              <Link href="/accessibility" className="text-blue-600 hover:text-blue-700 underline">
                Accessibility Statement
              </Link>
            </li>
          </ul>
        </section>
      </div>
    </div>
  )
}
