import Image from 'next/image'
import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <Image
          src="/images/Icons/01_Logo_Horizontal/ComplyEur_Logo_Horizontal.svg"
          alt="ComplyEur"
          width={150}
          height={40}
          className="mb-4 h-7 w-auto"
          priority
        />
        <p className="text-sm font-semibold text-brand-700">404</p>
        <h1 className="mt-2 text-2xl font-semibold text-gray-900">Page not found</h1>
        <p className="mt-2 text-sm text-gray-600">
          The page you requested does not exist or may have moved.
        </p>
        <div className="mt-6 flex gap-3">
          <Link
            href="/landing"
            className="inline-flex items-center justify-center rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-800"
          >
            Go to landing
          </Link>
          <Link
            href="/contact"
            className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:border-brand-300 hover:text-gray-900"
          >
            Contact support
          </Link>
        </div>
      </div>
    </main>
  )
}
