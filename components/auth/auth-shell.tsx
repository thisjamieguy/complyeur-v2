'use client'

import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

interface AuthShellProps {
  children: React.ReactNode
}

export function AuthShell({ children }: AuthShellProps) {
  const pathname = usePathname()
  const isSignupPage = pathname === '/signup'

  return (
    <div
      className={cn(
        'w-full',
        isSignupPage ? 'max-w-6xl xl:max-w-7xl' : 'max-w-md'
      )}
    >
      {children}
    </div>
  )
}
