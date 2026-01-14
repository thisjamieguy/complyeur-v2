'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight, Home } from 'lucide-react'

interface BreadcrumbItem {
  label: string
  href: string
  isLast: boolean
}

export function Breadcrumbs() {
  const pathname = usePathname()
  const items = generateBreadcrumbs(pathname)

  return (
    <nav
      aria-label="Breadcrumb"
      className="hidden sm:flex items-center gap-1 text-sm text-slate-500"
    >
      {items.map((item, index) => (
        <div key={item.href} className="flex items-center gap-1">
          {index > 0 && (
            <ChevronRight className="h-4 w-4 text-slate-400" aria-hidden="true" />
          )}
          {item.isLast ? (
            <span className="font-medium text-slate-900" aria-current="page">
              {item.label}
            </span>
          ) : (
            <Link
              href={item.href}
              className="flex items-center gap-1 hover:text-slate-700 transition-colors"
            >
              {index === 0 && <Home className="h-4 w-4" aria-hidden="true" />}
              {item.label}
            </Link>
          )}
        </div>
      ))}
    </nav>
  )
}

function generateBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const items: BreadcrumbItem[] = [
    { label: 'Home', href: '/dashboard', isLast: false },
  ]

  // Handle root dashboard case
  if (pathname === '/dashboard' || pathname === '/') {
    items[0].isLast = true
    return items
  }

  // Split pathname into segments
  const segments = pathname.split('/').filter(Boolean)

  // Build breadcrumb items from segments
  let currentPath = ''
  segments.forEach((segment, index) => {
    currentPath += `/${segment}`
    const isLast = index === segments.length - 1

    // Skip 'dashboard' if it's the first segment (already covered by Home)
    if (segment === 'dashboard' && index === 0) {
      return
    }

    items.push({
      label: formatSegment(segment),
      href: currentPath,
      isLast,
    })
  })

  // Update Home's isLast if it's the only item
  if (items.length === 1) {
    items[0].isLast = true
  }

  return items
}

function formatSegment(segment: string): string {
  // Replace hyphens with spaces and capitalize each word
  return segment
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}
