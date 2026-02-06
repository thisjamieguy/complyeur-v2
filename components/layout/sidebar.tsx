'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { PanelLeftClose, PanelLeft } from 'lucide-react'
import { navSections } from '@/components/navigation/nav-items'
import { useSidebar } from '@/contexts/sidebar-context'
import { UserMenu, type UserMenuUser } from './user-menu'
import { cn } from '@/lib/utils'

interface SidebarProps {
  user: UserMenuUser
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname()
  const { isOpen, toggle } = useSidebar()

  return (
    <aside
      className={cn(
        'hidden lg:flex flex-col h-screen bg-brand-900 transition-[width] duration-200 ease-out',
        isOpen ? 'w-64' : 'w-[72px]'
      )}
    >
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-brand-800">
        <Link
          href="/dashboard"
          className={cn(
            'flex items-center gap-3 min-h-[44px]',
            !isOpen && 'justify-center w-full'
          )}
        >
          <Image
            src="/images/Icons/03_Icon_Only/ComplyEur_Icon.svg"
            alt="ComplyEUR"
            width={32}
            height={32}
            className="shrink-0 brightness-0 invert"
          />
          {isOpen && (
            <Image
              src="/images/Icons/04_Wordmark_Only/ComplyEur_Wordmark.svg"
              alt="ComplyEUR"
              width={120}
              height={24}
              className="h-6 w-auto brightness-0 invert"
            />
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        {navSections.map((section) => (
          <div key={section.title} className="mb-6">
            {isOpen && (
              <h3 className="px-3 mb-2 text-xs font-semibold text-brand-400 uppercase tracking-wider">
                {section.title}
              </h3>
            )}
            <ul className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon
                const isActive =
                  pathname === item.href || pathname.startsWith(item.href + '/')

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-lg min-h-[44px] transition-colors duration-150',
                        isActive
                          ? 'bg-brand-600 text-white'
                          : 'text-brand-200 hover:bg-brand-800 hover:text-white',
                        !isOpen && 'justify-center px-0'
                      )}
                      title={!isOpen ? item.label : undefined}
                    >
                      <Icon className="h-5 w-5 shrink-0" />
                      {isOpen && (
                        <span className="text-sm font-medium truncate">
                          {item.label}
                        </span>
                      )}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Toggle Button */}
      <div className="px-3 py-2 border-t border-brand-800">
        <button
          onClick={toggle}
          className={cn(
            'flex items-center gap-3 w-full px-3 py-2.5 rounded-lg min-h-[44px]',
            'text-brand-300 hover:bg-brand-800 hover:text-white transition-colors duration-150',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400',
            !isOpen && 'justify-center px-0'
          )}
          aria-label={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        >
          {isOpen ? (
            <>
              <PanelLeftClose className="h-5 w-5 shrink-0" />
              <span className="text-sm font-medium">Collapse</span>
            </>
          ) : (
            <PanelLeft className="h-5 w-5 shrink-0" />
          )}
        </button>
      </div>

      {/* User Menu */}
      <div className="px-3 py-3 border-t border-brand-800">
        <UserMenu user={user} collapsed={!isOpen} />
      </div>
    </aside>
  )
}
