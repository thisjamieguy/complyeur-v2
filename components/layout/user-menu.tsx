'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { LogOut, Settings, ChevronUp, User } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

export interface UserMenuUser {
  id: string
  email: string
  full_name?: string | null
  role?: string | null
}

interface UserMenuProps {
  user: UserMenuUser
  collapsed?: boolean
}

export function UserMenu({ user, collapsed = false }: UserMenuProps) {
  const router = useRouter()
  const [isSigningOut, setIsSigningOut] = useState(false)

  const displayName = user.full_name || user.email
  const initials = getInitials(displayName)

  async function handleSignOut() {
    if (isSigningOut) return

    setIsSigningOut(true)
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      router.push('/login')
    } catch (error) {
      console.error('Sign out error:', error)
      setIsSigningOut(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            'flex items-center gap-3 w-full rounded-lg p-2 min-h-[44px]',
            'text-left text-slate-300 hover:bg-slate-800 transition-colors duration-150',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
            collapsed && 'justify-center'
          )}
          aria-label="User menu"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-700 text-sm font-medium text-white">
            {initials}
          </div>

          {!collapsed && (
            <>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {displayName}
                </p>
                {user.full_name && (
                  <p className="text-xs text-slate-400 truncate">{user.email}</p>
                )}
              </div>

              {user.role && (
                <Badge
                  variant="secondary"
                  className="shrink-0 bg-slate-700 text-slate-300 border-slate-600 text-[10px] px-1.5"
                >
                  {user.role}
                </Badge>
              )}

              <ChevronUp className="h-4 w-4 shrink-0 text-slate-400" />
            </>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        side={collapsed ? 'right' : 'top'}
        align={collapsed ? 'start' : 'center'}
        sideOffset={8}
        className="w-56"
      >
        <div className="px-2 py-1.5">
          <p className="text-sm font-medium truncate">{displayName}</p>
          <p className="text-xs text-muted-foreground truncate">{user.email}</p>
        </div>

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link href="/settings" className="cursor-pointer">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={handleSignOut}
          disabled={isSigningOut}
          className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
        >
          <LogOut className="mr-2 h-4 w-4" />
          {isSigningOut ? 'Signing out...' : 'Sign out'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}
