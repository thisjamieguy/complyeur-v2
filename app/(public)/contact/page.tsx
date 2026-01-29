import Link from 'next/link'

export default function ContactPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold text-slate-900 mb-4">Contact Us</h1>
      <p className="text-base text-slate-600 mb-6">
        Have questions about ComplyEUR or need help with your account? We&apos;re here to help.
        Whether you&apos;re exploring Schengen compliance solutions for your UK business,
        need technical support with the platform, or want to discuss partnership opportunities,
        our team is ready to assist.
      </p>
      <p className="text-base text-slate-600 mb-12">
        ComplyEUR helps UK businesses track the 90/180-day Schengen visa rule for employees
        travelling to the EU. Since Brexit, non-EU nationals working for UK companies must
        carefully monitor their travel to avoid overstaying and facing penalties including
        fines, entry bans, and employees being refused at the border.
      </p>

      <div className="prose prose-slate max-w-none">
        {/* Contact Options */}
        <section>
          <h2 className="text-2xl font-semibold text-slate-900 mb-6">Get in Touch</h2>
          <p className="text-base text-slate-600 mb-6">
            Choose the most appropriate contact channel below based on your enquiry type.
            Our team monitors all inboxes during UK business hours and aims to respond
            within one to two working days.
          </p>

          <div className="grid gap-6 sm:grid-cols-2">
            {/* General Enquiries */}
            <div className="bg-slate-50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-2">General Enquiries</h3>
              <p className="text-sm text-slate-600 mb-4">
                Questions about ComplyEUR features, pricing plans, implementation timelines,
                or how the platform can work for your organisation.
              </p>
              <a
                href="mailto:hello@complyeur.com"
                className="text-blue-600 hover:text-blue-700 underline font-medium"
              >
                hello@complyeur.com
              </a>
            </div>

            {/* Support */}
            <div className="bg-slate-50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Customer Support</h3>
              <p className="text-sm text-slate-600 mb-4">
                Technical issues with the platform, account access problems, data import
                assistance, or questions about specific compliance features.
              </p>
              <a
                href="mailto:support@complyeur.com"
                className="text-blue-600 hover:text-blue-700 underline font-medium"
              >
                support@complyeur.com
              </a>
            </div>

            {/* Privacy */}
            <div className="bg-slate-50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Privacy Requests</h3>
              <p className="text-sm text-slate-600 mb-4">
                GDPR data subject requests including data access, correction, deletion,
                or portability. We handle all privacy matters promptly and securely.
              </p>
              <a
                href="mailto:privacy@complyeur.com"
                className="text-blue-600 hover:text-blue-700 underline font-medium"
              >
                privacy@complyeur.com
              </a>
            </div>

            {/* Partnerships */}
            <div className="bg-slate-50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Partnerships</h3>
              <p className="text-sm text-slate-600 mb-4">
                Business development opportunities, HR software integrations, reseller
                programmes, or strategic collaboration discussions.
              </p>
              <a
                href="mailto:partnerships@complyeur.com"
                className="text-blue-600 hover:text-blue-700 underline font-medium"
              >
                partnerships@complyeur.com
              </a>
            </div>
          </div>
        </section>

        {/* Response Times */}
        <section>
          <h2 className="text-2xl font-semibold text-slate-900 mt-12 mb-4">Response Times</h2>
          <p className="text-base text-slate-700 leading-relaxed mb-4">
            We aim to respond to all enquiries within 1-2 business days. For urgent support
            issues affecting your ability to use the platform, please include
            &quot;URGENT&quot; in your email subject line and we will prioritise your request.
          </p>
          <p className="text-base text-slate-700 leading-relaxed">
            Our support hours are Monday to Friday, 9am to 5pm GMT, excluding UK bank holidays.
            Enquiries received outside of these hours will be addressed on the next business day.
          </p>
        </section>

        {/* For Existing Customers */}
        <section className="mt-12">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-3">Existing Customers</h3>
            <p className="text-base text-blue-800">
              If you already have a ComplyEUR account, the fastest way to get help is through
              the support options in your dashboard. You can also access our help documentation
              and FAQs from within the app.
            </p>
          </div>
        </section>

        {/* Company Information */}
        <section>
          <h2 className="text-2xl font-semibold text-slate-900 mt-12 mb-4">Company Information</h2>
          <p className="text-base text-slate-700 leading-relaxed">
            ComplyEUR is a UK-based company focused on helping businesses navigate post-Brexit
            travel compliance requirements.
          </p>
          <ul className="text-base text-slate-700 ml-6 list-disc space-y-2 mt-4">
            <li>
              <strong>Registered in:</strong> England and Wales
            </li>
            <li>
              <strong>Website:</strong>{' '}
              <a href="https://complyeur.com" className="text-blue-600 hover:text-blue-700 underline">
                complyeur.com
              </a>
            </li>
          </ul>
        </section>

        {/* Related Links */}
        <section className="mt-16 pt-8 border-t border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Related Pages</h2>
          <ul className="text-base text-slate-700 space-y-2">
            <li>
              <Link href="/about" className="text-blue-600 hover:text-blue-700 underline">
                About ComplyEUR
              </Link>
            </li>
            <li>
              <Link href="/privacy" className="text-blue-600 hover:text-blue-700 underline">
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link href="/terms" className="text-blue-600 hover:text-blue-700 underline">
                Terms of Service
              </Link>
            </li>
          </ul>
        </section>
      </div>
    </div>
  )
}
