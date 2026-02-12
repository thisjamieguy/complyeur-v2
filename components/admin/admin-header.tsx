'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Menu, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import {
  LayoutDashboard,
  Building2,
  Layers,
  Activity,
  Settings,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface AdminHeaderProps {
  user: {
    email?: string | null
  }
  adminName?: string | null
}

const navigation = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'Companies', href: '/admin/companies', icon: Building2 },
  { name: 'Tiers', href: '/admin/tiers', icon: Layers },
  { name: 'Activity', href: '/admin/activity', icon: Activity },
  { name: 'Settings', href: '/admin/settings', icon: Settings },
]

export function AdminHeader({ user, adminName }: AdminHeaderProps) {
  const pathname = usePathname()

  // Get page title based on current path
  const getPageTitle = () => {
    if (pathname === '/admin') return 'Dashboard'
    if (pathname.startsWith('/admin/companies/') && pathname !== '/admin/companies') {
      return 'Company Details'
    }
    const currentNav = navigation.find(item =>
      item.href !== '/admin' && pathname.startsWith(item.href)
    )
    return currentNav?.name || 'Admin'
  }

  return (
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-slate-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
      {/* Mobile menu */}
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="lg:hidden">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Open sidebar</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0">
          <div className="flex h-16 shrink-0 items-center gap-2 px-6 border-b border-slate-200">
            <Image
              src="/images/Icons/03_Icon_Only/ComplyEur_Icon.svg"
              alt=""
              width={28}
              height={28}
              aria-hidden="true"
            />
            <Image
              src="/images/Icons/04_Wordmark_Only/ComplyEur_Wordmark.svg"
              alt="ComplyEur"
              width={100}
              height={20}
              className="h-5 w-auto"
            />
            <span className="rounded-md bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
              Admin
            </span>
          </div>
          <nav className="flex flex-1 flex-col p-4">
            <ul role="list" className="flex flex-1 flex-col gap-y-1">
              {navigation.map((item) => {
                const isActive = pathname === item.href ||
                  (item.href !== '/admin' && pathname.startsWith(item.href))

                return (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className={cn(
                        'group flex gap-x-3 rounded-lg p-3 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-slate-100 text-slate-900'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      )}
                    >
                      <item.icon className="h-5 w-5 shrink-0" />
                      {item.name}
                    </Link>
                  </li>
                )
              })}
            </ul>
            <div className="mt-auto pt-4 border-t border-slate-200">
              <Link
                href="/dashboard"
                className="group flex gap-x-3 rounded-lg p-3 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
              >
                <ArrowLeft className="h-5 w-5 shrink-0" />
                Back to App
              </Link>
            </div>
          </nav>
        </SheetContent>
      </Sheet>

      {/* Page title */}
      <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
        <div className="flex items-center gap-x-4 lg:gap-x-6">
          <Link href="/admin" className="flex items-center gap-2 lg:hidden">
            <Image
              src="/images/Icons/03_Icon_Only/ComplyEur_Icon.svg"
              alt="ComplyEur"
              width={24}
              height={24}
              className="h-6 w-6"
            />
            <Image
              src="/images/Icons/04_Wordmark_Only/ComplyEur_Wordmark.svg"
              alt="ComplyEur"
              width={90}
              height={18}
              className="h-4 w-auto"
            />
          </Link>
          <h1 className="text-lg font-semibold text-slate-900">
            {getPageTitle()}
          </h1>
        </div>
      </div>

      {/* User info */}
      <div className="flex items-center gap-x-4 lg:gap-x-6">
        <div className="hidden sm:block">
          <p className="text-sm font-medium text-slate-900">
            {adminName || 'Admin'}
          </p>
          <p className="text-xs text-slate-500">{user.email}</p>
        </div>
      </div>
    </header>
  )
}
