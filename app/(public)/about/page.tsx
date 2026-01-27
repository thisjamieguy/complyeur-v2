import Link from 'next/link'

export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold text-slate-900 mb-8">About ComplyEUR</h1>

      <div className="prose prose-slate max-w-none">
        {/* What We Do */}
        <section>
          <h2 className="text-2xl font-semibold text-slate-900 mt-12 mb-4">What We Do</h2>
          <p className="text-base text-slate-700 leading-relaxed">
            ComplyEUR is a compliance tracking platform designed for UK businesses with employees
            who travel to the European Union. We help companies monitor and manage the EU&apos;s
            Schengen 90/180-day visa rule, ensuring your team stays compliant while traveling
            for work.
          </p>
          <p className="text-base text-slate-700 leading-relaxed mt-4">
            Since Brexit, UK nationals no longer have freedom of movement in the EU. When
            traveling to Schengen Area countries, UK citizens are limited to 90 days within
            any rolling 180-day period. Tracking this manually across multiple employees
            and trips is complex and error-prone. ComplyEUR automates this process.
          </p>
        </section>

        {/* The 90/180-Day Rule */}
        <section>
          <h2 className="text-2xl font-semibold text-slate-900 mt-12 mb-4">The 90/180-Day Rule</h2>
          <p className="text-base text-slate-700 leading-relaxed">
            The Schengen visa rule applies to all non-EU citizens, including UK passport holders.
            Here&apos;s how it works:
          </p>
          <ul className="text-base text-slate-700 ml-6 list-disc space-y-2 mt-4">
            <li>
              <strong>90-day limit:</strong> You can spend up to 90 days in the Schengen Area
              within any 180-day period.
            </li>
            <li>
              <strong>Rolling window:</strong> The 180-day period is calculated backwards from
              each day you want to enter or stay. It&apos;s not a fixed calendar period.
            </li>
            <li>
              <strong>Entry and exit days count:</strong> Both the day you arrive and the day
              you leave count as full days in the Schengen Area.
            </li>
            <li>
              <strong>All Schengen countries count together:</strong> Days spent in any Schengen
              country count toward your total (Germany, France, Spain, Italy, etc.).
            </li>
          </ul>
          <p className="text-base text-slate-700 leading-relaxed mt-4">
            Overstaying can result in fines, entry bans, and complications for future travel.
            For businesses, non-compliance can disrupt operations and create legal liability.
          </p>
        </section>

        {/* Who We Help */}
        <section>
          <h2 className="text-2xl font-semibold text-slate-900 mt-12 mb-4">Who We Help</h2>
          <p className="text-base text-slate-700 leading-relaxed">
            ComplyEUR is built for UK businesses that need to track employee travel to the EU:
          </p>
          <ul className="text-base text-slate-700 ml-6 list-disc space-y-2 mt-4">
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

        {/* How ComplyEUR Works */}
        <section>
          <h2 className="text-2xl font-semibold text-slate-900 mt-12 mb-4">How ComplyEUR Works</h2>
          <p className="text-base text-slate-700 leading-relaxed">
            Our platform makes compliance tracking straightforward:
          </p>
          <ul className="text-base text-slate-700 ml-6 list-disc space-y-2 mt-4">
            <li>
              <strong>Add employees:</strong> Create profiles for each team member who travels to the EU.
            </li>
            <li>
              <strong>Log trips:</strong> Record travel dates and destinations. Import from spreadsheets
              or enter manually.
            </li>
            <li>
              <strong>Track compliance:</strong> See at a glance how many days each employee has used
              and how many remain in their current 180-day window.
            </li>
            <li>
              <strong>Get alerts:</strong> Receive notifications when employees are approaching their
              90-day limit.
            </li>
            <li>
              <strong>Plan ahead:</strong> Check future travel dates against the rolling window before
              booking trips.
            </li>
          </ul>
        </section>

        {/* Important Disclaimer */}
        <section className="mt-12">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-amber-900 mb-3">Important Notice</h3>
            <p className="text-base text-amber-800">
              ComplyEUR is a compliance tracking tool, not a legal service. While we strive for
              accuracy, the calculations provided are for informational purposes only. We recommend
              consulting with immigration professionals for specific legal advice. ComplyEUR is
              not responsible for any consequences arising from travel decisions based on our
              platform. Always verify compliance requirements with relevant authorities before
              traveling.
            </p>
          </div>
        </section>

        {/* Related Links */}
        <section className="mt-16 pt-8 border-t border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Learn More</h2>
          <ul className="text-base text-slate-700 space-y-2">
            <li>
              <Link href="/contact" className="text-blue-600 hover:text-blue-700 underline">
                Contact Us
              </Link>
            </li>
            <li>
              <Link href="/terms" className="text-blue-600 hover:text-blue-700 underline">
                Terms of Service
              </Link>
            </li>
            <li>
              <Link href="/privacy" className="text-blue-600 hover:text-blue-700 underline">
                Privacy Policy
              </Link>
            </li>
          </ul>
        </section>
      </div>
    </div>
  )
}
