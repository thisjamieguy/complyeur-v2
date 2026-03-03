import Link from 'next/link'

export function DashboardFooter() {
  return (
    <footer className="border-t border-brand-100 bg-white">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-brand-400">
          <p>&copy; {new Date().getFullYear()} ComplyEur. All rights reserved.</p>
          <div className="flex gap-4">
            <Link
              href="/privacy"
              className="hover:text-brand-700 transition-colors"
            >
              Privacy
            </Link>
            <Link
              href="/terms"
              className="hover:text-brand-700 transition-colors"
            >
              Terms
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
