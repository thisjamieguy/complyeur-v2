'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'

interface FAQItem {
  question: string
  answer: string | React.ReactNode
}

interface FAQSection {
  title: string
  items: FAQItem[]
}

// Generate FAQ schema for SEO (only includes string answers)
function generateFAQSchema() {
  const questions = faqData
    .flatMap((section) => section.items)
    .filter((item): item is FAQItem & { answer: string } => typeof item.answer === 'string')
    .map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    }))

  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: questions,
  }
}

const faqData: FAQSection[] = [
  {
    title: 'The 90/180-Day Rule',
    items: [
      {
        question: 'What is the 90/180-day rule?',
        answer:
          'The Schengen 90/180-day rule limits non-EU citizens (including UK nationals post-Brexit) to 90 days within any rolling 180-day period in the Schengen Area. This means on any given day, you look back 180 days and count how many days you spent in Schengen countries. That total cannot exceed 90 days.',
      },
      {
        question: 'Do both arrival and departure days count?',
        answer:
          'Yes. Both the day you enter and the day you leave a Schengen country count as full days. A one-day business trip counts as 1 day, not 0.',
      },
      {
        question: 'Which countries are in the Schengen Area?',
        answer:
          'The Schengen Area includes 29 European countries: Austria, Belgium, Bulgaria, Croatia, Czech Republic, Denmark, Estonia, Finland, France, Germany, Greece, Hungary, Iceland, Italy, Latvia, Liechtenstein, Lithuania, Luxembourg, Malta, Netherlands, Norway, Poland, Portugal, Romania, Slovakia, Slovenia, Spain, Sweden, and Switzerland. Note: Ireland is NOT in Schengen.',
      },
      {
        question: 'What happens if I overstay?',
        answer:
          'Overstaying can result in fines, deportation, and entry bans ranging from 1-5 years. It can also create complications for future visa applications and business travel. For companies, employee non-compliance can disrupt projects and create legal liability.',
      },
      {
        question: 'Is the 180-day window a calendar period?',
        answer:
          'No. The 180-day window is a rolling period calculated backwards from each day. It is not fixed to calendar months or years. This rolling calculation is what makes manual tracking so difficult.',
      },
    ],
  },
  {
    title: 'Using ComplyEUR',
    items: [
      {
        question: 'How do I add an employee?',
        answer:
          'From the Dashboard, click the "Add Employee" button. Enter their name to get started. You can also add a job reference to help identify them within your organisation.',
      },
      {
        question: 'How do I log a trip?',
        answer:
          'Click on an employee row in the Dashboard, then click "Add Trip". Enter the start date, end date, and destination country. You can also use the Quick Add button on the Dashboard for faster entry, or import multiple trips via CSV/Excel.',
      },
      {
        question: 'What do the status colours mean?',
        answer: (
          <div className="space-y-2">
            <p>
              Status is based on how many days an employee has used in the rolling 180-day window:
            </p>
            <p>
              <span className="inline-block w-3 h-3 rounded-full bg-green-500 mr-2" />
              <strong>Green (Compliant):</strong> 0-60 days used. Safe to travel.
            </p>
            <p>
              <span className="inline-block w-3 h-3 rounded-full bg-amber-500 mr-2" />
              <strong>Amber (At Risk):</strong> 61-75 days used. Plan travel carefully.
            </p>
            <p>
              <span className="inline-block w-3 h-3 rounded-full bg-red-500 mr-2" />
              <strong>Red (Non-Compliant):</strong> 76-89 days used. Approaching the limit.
            </p>
            <p>
              <span className="inline-block w-3 h-3 rounded-full bg-slate-900 mr-2" />
              <strong>Black (Breach):</strong> 90+ days used. Employee has exceeded the legal limit.
            </p>
            <p className="text-sm text-slate-500 mt-2">
              These thresholds can be customised in Settings.
            </p>
          </div>
        ),
      },
      {
        question: 'What is "Days Remaining"?',
        answer:
          'Days Remaining shows how many more days an employee can spend in the Schengen Area today without exceeding the 90-day limit. This number changes daily as old trips drop out of the 180-day window and new trips are added.',
      },
      {
        question: 'Can I customise the status thresholds?',
        answer:
          'Yes. Go to Settings > Status Thresholds to adjust when employees move between Green, Amber, and Red status. The Breach threshold (90+ days) cannot be changed as it reflects the legal limit.',
      },
    ],
  },
  {
    title: 'Importing Data',
    items: [
      {
        question: 'What file formats can I import?',
        answer:
          'ComplyEUR supports CSV and Excel (.xlsx) files. Your file should include columns for employee name, trip start date, trip end date, and optionally destination country and job reference.',
      },
      {
        question: 'How does column mapping work?',
        answer:
          'After uploading, you will see a mapping screen where you match your spreadsheet columns to ComplyEUR fields. We auto-detect common column names, but you can adjust the mapping manually. Save your mapping for future imports.',
      },
      {
        question: 'What date formats are supported?',
        answer:
          'ComplyEUR detects common date formats including DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD, and variations with different separators. During import, you will confirm the detected format to ensure dates are parsed correctly.',
      },
      {
        question: 'How are duplicate trips handled?',
        answer:
          'During import, ComplyEUR detects potential duplicates (same employee, same dates). You can choose to skip duplicates, update existing trips, or import them anyway. We recommend skipping duplicates to avoid double-counting days.',
      },
      {
        question: 'My import failed. What should I check?',
        answer: (
          <div className="space-y-3">
            <ul className="list-disc ml-6 space-y-1">
              <li>Ensure your file has headers in the first row</li>
              <li>Check that dates are in a consistent format throughout</li>
              <li>Verify employee names match exactly (including spelling and spacing)</li>
              <li>Remove any completely empty rows</li>
              <li>Check the validation summary for specific row errors</li>
            </ul>
            <p>
              Still stuck? Contact us at{' '}
              <a href="mailto:support@complyeur.com" className="text-blue-600 hover:text-blue-700 underline">
                support@complyeur.com
              </a>{' '}
              and we will help you get your data imported.
            </p>
          </div>
        ),
      },
    ],
  },
  {
    title: 'Trip Forecast',
    items: [
      {
        question: 'What is the Trip Forecast tool?',
        answer:
          'Trip Forecast is a "what-if" calculator that lets you check whether a proposed trip would cause compliance issues before booking. Enter an employee, proposed dates, and see instantly whether the trip is safe.',
      },
      {
        question: 'What do the forecast risk levels mean?',
        answer: (
          <div className="space-y-2">
            <p>
              <strong>Low Risk:</strong> The trip fits comfortably within the
              remaining allowance. Safe to book.
            </p>
            <p>
              <strong>Medium Risk:</strong> The trip is possible but leaves
              little buffer. Consider shorter dates or review upcoming travel.
            </p>
            <p>
              <strong>High Risk:</strong> The trip would exceed the 90-day limit.
              Do not book without adjusting dates or cancelling other trips.
            </p>
          </div>
        ),
      },
      {
        question: 'Can I forecast trips for multiple employees at once?',
        answer:
          'Currently, Trip Forecast handles one employee at a time. For group travel planning, check each employee individually to ensure the whole team can travel.',
      },
    ],
  },
  {
    title: 'Future Job Alerts',
    items: [
      {
        question: 'What are Future Job Alerts?',
        answer:
          'Future Job Alerts proactively warn you when an employee has upcoming trips that may cause compliance issues. These alerts appear before problems occur, giving you time to adjust plans.',
      },
      {
        question: 'How far ahead do alerts look?',
        answer:
          'Alerts scan all future trips in the system and flag any that would push an employee over the 90-day limit based on their current and planned travel.',
      },
      {
        question: 'How do I dismiss an alert?',
        answer:
          'Click "Acknowledge" on an alert to dismiss it. This indicates you have seen and addressed the warning. Acknowledged alerts are logged for compliance records.',
      },
    ],
  },
  {
    title: 'Calendar View',
    items: [
      {
        question: 'What does the Calendar show?',
        answer:
          'The Calendar provides a Gantt-style timeline view of all employee trips. Each row is an employee, and trip bars show when they were (or will be) in the Schengen Area. This helps visualise travel patterns across your team.',
      },
      {
        question: 'Can I edit trips from the Calendar?',
        answer:
          'The Calendar is a read-only view for visualising travel patterns. To edit or delete trips, go to the Dashboard and click on the employee, then manage their trips from the employee detail page.',
      },
      {
        question: 'How do I change the date range?',
        answer:
          'Use the navigation controls to move forward or backward in time. You can view past trips, current trips, and planned future trips.',
      },
    ],
  },
  {
    title: 'GDPR & Data Privacy',
    items: [
      {
        question: 'What data does ComplyEUR store?',
        answer:
          'We store employee names, trip dates, destinations, and job references. All data is encrypted at rest and in transit. We do not sell or share your data with third parties.',
      },
      {
        question: "How do I export an employee's data (DSAR)?",
        answer:
          'Go to the GDPR Tools section and click "Export Data" next to the employee. This generates a complete data export in JSON format for Data Subject Access Requests.',
      },
      {
        question: "How do I delete an employee's data?",
        answer:
          'In GDPR Tools, click "Delete" next to the employee. You can choose full deletion (permanent after 30-day recovery window) or anonymisation (keeps trip data for reporting but removes personal identifiers).',
      },
      {
        question: 'Can I recover deleted data?',
        answer:
          'Yes, within 30 days of deletion. Go to GDPR Tools > Deleted Employees to view and restore recently deleted records. After 30 days, deletion is permanent.',
      },
      {
        question: 'Where is my data stored?',
        answer:
          'ComplyEUR uses Supabase (built on PostgreSQL) with data centres in the EU. Your data never leaves the EU unless you explicitly export it.',
      },
    ],
  },
  {
    title: 'Account & Billing',
    items: [
      {
        question: 'How do I change my password?',
        answer:
          'Click your profile icon in the top right, then go to Settings > Security. You can change your password or enable multi-factor authentication.',
      },
      {
        question: 'How do I add team members?',
        answer:
          'Go to Settings > Team. Enter the email address of your colleague and select their role (Admin or Viewer). They will receive an invitation to join your company account.',
      },
      {
        question: 'How does billing work?',
        answer:
          'ComplyEUR bills monthly based on your subscription tier. Each tier includes a set number of employees. You can upgrade or downgrade at any time, with changes taking effect on your next billing date.',
      },
      {
        question: 'Can I cancel my subscription?',
        answer:
          'Yes. Go to Settings > Billing and click "Cancel Subscription". You will retain access until the end of your current billing period. Your data is retained for 30 days after cancellation in case you wish to reactivate.',
      },
    ],
  },
]

function FAQItemComponent({ item }: { item: FAQItem }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="flex w-full items-center justify-between py-4 text-left text-base font-medium text-slate-900 hover:text-slate-700 border-b border-slate-200">
        <span>{item.question}</span>
        <ChevronDown
          className={`h-5 w-5 text-slate-500 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="overflow-hidden">
        <div className="pb-4 pt-2 text-base text-slate-700 leading-relaxed">
          {item.answer}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

export default function FAQPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <h1 className="text-3xl font-bold text-slate-900 mb-4">
        Frequently Asked Questions
      </h1>
      <p className="text-base text-slate-600 mb-12">
        Find answers to common questions about the 90/180-day rule and using
        ComplyEUR.
      </p>

      <div className="space-y-12">
        {faqData.map((section) => (
          <section key={section.title}>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">
              {section.title}
            </h2>
            <div className="bg-white rounded-xl border border-slate-200 px-6">
              {section.items.map((item, index) => (
                <FAQItemComponent key={index} item={item} />
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* Still have questions */}
      <section className="mt-16">
        <div className="bg-slate-50 rounded-xl p-6 text-center">
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            Still have questions?
          </h3>
          <p className="text-base text-slate-600 mb-4">
            We are here to help. Get in touch and we will respond as soon as we
            can.
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center justify-center px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Contact Us
          </Link>
        </div>
      </section>

      {/* Related Links */}
      <section className="mt-12 pt-8 border-t border-slate-200">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">
          Related Pages
        </h2>
        <ul className="text-base text-slate-700 space-y-2">
          <li>
            <Link
              href="/about"
              className="text-blue-600 hover:text-blue-700 underline"
            >
              About ComplyEUR
            </Link>
          </li>
          <li>
            <Link
              href="/privacy"
              className="text-blue-600 hover:text-blue-700 underline"
            >
              Privacy Policy
            </Link>
          </li>
          <li>
            <Link
              href="/terms"
              className="text-blue-600 hover:text-blue-700 underline"
            >
              Terms of Service
            </Link>
          </li>
        </ul>
      </section>

      {/* FAQ Schema for SEO - content is from static faqData, not user input */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(generateFAQSchema()),
        }}
      />
    </div>
  )
}
