import Link from 'next/link'

export default function AccessibilityPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold text-slate-900 mb-2">Accessibility Statement</h1>
      <p className="text-sm text-slate-500 mb-12">Last updated: January 9, 2025</p>

      <div className="prose prose-slate max-w-none">
        {/* 1. Our Commitment */}
        <section>
          <h2 className="text-2xl font-semibold text-slate-900 mt-12 mb-4">1. Our Commitment</h2>
          <p className="text-base text-slate-700 leading-relaxed">
            ComplyEUR is committed to ensuring digital accessibility for people of all abilities.
            We believe that everyone should have equal access to information and functionality
            on our platform, regardless of any disabilities or impairments.
          </p>
          <p className="text-base text-slate-700 leading-relaxed mt-4">
            We are actively working to increase the accessibility and usability of our service
            and in doing so adhere to available standards and guidelines.
          </p>
        </section>

        {/* 2. Accessibility Standards */}
        <section>
          <h2 className="text-2xl font-semibold text-slate-900 mt-12 mb-4">2. Accessibility Standards</h2>
          <p className="text-base text-slate-700 leading-relaxed">
            We aim to conform to the{' '}
            <strong>Web Content Accessibility Guidelines (WCAG) 2.1 Level AA</strong> standards.
            These guidelines explain how to make web content more accessible for people with
            disabilities, and more user-friendly for everyone.
          </p>
          <p className="text-base text-slate-700 leading-relaxed mt-4">
            The guidelines have three levels of accessibility (A, AA, and AAA). We have chosen
            Level AA as our target as it addresses the major accessibility barriers while
            remaining achievable for our application type.
          </p>
        </section>

        {/* 3. What We're Doing */}
        <section>
          <h2 className="text-2xl font-semibold text-slate-900 mt-12 mb-4">3. What We&apos;re Doing</h2>
          <p className="text-base text-slate-700 leading-relaxed">
            We have taken the following measures to ensure accessibility on ComplyEUR:
          </p>

          <h3 className="text-xl font-semibold text-slate-900 mt-8 mb-3">Semantic HTML</h3>
          <ul className="text-base text-slate-700 ml-6 list-disc space-y-2">
            <li>We use proper HTML elements to convey meaning and structure</li>
            <li>Headings are used in a logical, hierarchical order (H1, H2, H3)</li>
            <li>Lists are marked up using appropriate list elements</li>
            <li>Form fields are properly labeled and associated with their labels</li>
          </ul>

          <h3 className="text-xl font-semibold text-slate-900 mt-8 mb-3">Keyboard Navigation</h3>
          <ul className="text-base text-slate-700 ml-6 list-disc space-y-2">
            <li>All interactive elements can be accessed using keyboard only</li>
            <li>Focus indicators are visible when navigating with a keyboard</li>
            <li>Tab order follows a logical sequence through the page</li>
            <li>Skip links allow users to bypass repetitive navigation</li>
          </ul>

          <h3 className="text-xl font-semibold text-slate-900 mt-8 mb-3">Visual Design</h3>
          <ul className="text-base text-slate-700 ml-6 list-disc space-y-2">
            <li>Color contrast ratios meet WCAG 2.1 AA requirements (minimum 4.5:1 for normal text)</li>
            <li>Information is not conveyed by color alone</li>
            <li>Text can be resized up to 200% without loss of content or functionality</li>
            <li>Touch targets are sized appropriately for mobile users (minimum 44x44 pixels)</li>
          </ul>

          <h3 className="text-xl font-semibold text-slate-900 mt-8 mb-3">Forms and Inputs</h3>
          <ul className="text-base text-slate-700 ml-6 list-disc space-y-2">
            <li>All form fields have clear, descriptive labels</li>
            <li>Error messages are clear and provide guidance on how to fix issues</li>
            <li>Required fields are clearly indicated</li>
            <li>Form validation messages are announced to screen readers</li>
          </ul>

          <h3 className="text-xl font-semibold text-slate-900 mt-8 mb-3">Screen Reader Compatibility</h3>
          <ul className="text-base text-slate-700 ml-6 list-disc space-y-2">
            <li>ARIA attributes are used where necessary to enhance accessibility</li>
            <li>Dynamic content updates are announced to assistive technologies</li>
            <li>Images have appropriate alt text descriptions</li>
            <li>Icons used for functionality have accessible labels</li>
          </ul>
        </section>

        {/* 4. Known Limitations */}
        <section>
          <h2 className="text-2xl font-semibold text-slate-900 mt-12 mb-4">4. Known Limitations</h2>
          <p className="text-base text-slate-700 leading-relaxed">
            While we strive to make ComplyEUR as accessible as possible, some areas may have
            limitations. We are actively working to address these:
          </p>
          <ul className="text-base text-slate-700 ml-6 list-disc space-y-2 mt-4">
            <li>
              <strong>Calendar view:</strong> The interactive calendar for viewing travel
              dates may have limited keyboard navigation in some complex scenarios. We are
              working on improving this functionality.
            </li>
            <li>
              <strong>Data tables:</strong> Some complex data tables may not be fully
              optimized for screen readers. We are reviewing and enhancing table markup.
            </li>
            <li>
              <strong>Third-party content:</strong> Some third-party integrations (such as
              payment processing) may have their own accessibility limitations outside our
              direct control.
            </li>
          </ul>
          <p className="text-base text-slate-700 leading-relaxed mt-4">
            We are committed to addressing these limitations as part of our ongoing
            accessibility improvement efforts.
          </p>
        </section>

        {/* 5. Feedback and Contact */}
        <section>
          <h2 className="text-2xl font-semibold text-slate-900 mt-12 mb-4">5. Feedback and Contact</h2>
          <p className="text-base text-slate-700 leading-relaxed">
            We welcome your feedback on the accessibility of ComplyEUR. If you encounter
            any accessibility barriers or have suggestions for improvement, please let us know:
          </p>
          <ul className="text-base text-slate-700 ml-6 list-disc space-y-2 mt-4">
            <li>
              <strong>Email:</strong>{' '}
              <a href="mailto:accessibility@complyeur.com" className="text-blue-600 hover:text-blue-700 underline">
                accessibility@complyeur.com
              </a>
            </li>
            <li>
              <strong>Response time:</strong> We aim to respond to accessibility feedback
              within 2 business days.
            </li>
          </ul>

          <h3 className="text-xl font-semibold text-slate-900 mt-8 mb-3">When Contacting Us</h3>
          <p className="text-base text-slate-700 leading-relaxed">
            To help us address your feedback effectively, please include:
          </p>
          <ul className="text-base text-slate-700 ml-6 list-disc space-y-2 mt-4">
            <li>A description of the accessibility issue you encountered</li>
            <li>The page or feature where the issue occurred</li>
            <li>The assistive technology you were using (if applicable)</li>
            <li>Your browser and operating system</li>
          </ul>
        </section>

        {/* Continuous Improvement */}
        <section className="mt-12 bg-slate-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-3">Our Ongoing Commitment</h3>
          <p className="text-base text-slate-700 leading-relaxed">
            Accessibility is an ongoing effort. We regularly review our platform to identify
            and fix accessibility issues. Our team is trained on accessibility best practices,
            and we incorporate accessibility testing into our development process.
          </p>
        </section>

        {/* Related Links */}
        <section className="mt-16 pt-8 border-t border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Related Documents</h2>
          <ul className="text-base text-slate-700 space-y-2">
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
