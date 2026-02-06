'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { formatDistanceToNow, parseISO } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getTierBadgeClassName, getTierDisplayName } from '@/lib/billing/plans'

interface CompanyEntitlement {
  tier_slug: string | null
  is_trial: boolean | null
  trial_ends_at: string | null
  is_suspended: boolean | null
}

interface Company {
  id: string
  name: string
  slug: string
  created_at: string | null
  company_entitlements: CompanyEntitlement | null
  profiles: { count: number }[] | null
  employees: { count: number }[] | null
}

interface CompaniesTableProps {
  companies: Company[]
  currentPage: number
  totalPages: number
  tiers: Array<{
    slug: string
    display_name: string
  }>
}

function getStatusBadge(entitlement: CompanyEntitlement | null) {
  if (!entitlement) {
    return <Badge variant="secondary">No Data</Badge>
  }

  if (entitlement.is_suspended) {
    return <Badge variant="destructive">Suspended</Badge>
  }

  if (entitlement.is_trial) {
    const trialEnds = entitlement.trial_ends_at
      ? parseISO(entitlement.trial_ends_at)
      : null
    const isExpired = trialEnds && trialEnds < new Date()

    if (isExpired) {
      return <Badge variant="destructive">Trial Expired</Badge>
    }

    return (
      <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
        Trial
      </Badge>
    )
  }

  return (
    <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
      Active
    </Badge>
  )
}

function getTierBadge(tierSlug: string | null, displayName: string | null | undefined) {
  const slug = tierSlug || 'free'

  return (
    <Badge className={cn(getTierBadgeClassName(slug), 'hover:opacity-90')}>
      {getTierDisplayName(slug, displayName)}
    </Badge>
  )
}

export function CompaniesTable({
  companies,
  currentPage,
  totalPages,
  tiers,
}: CompaniesTableProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tierDisplayNameBySlug = new Map(
    tiers.map((tier) => [tier.slug, tier.display_name] as const)
  )

  const navigateToPage = (page: number) => {
    const params = new URLSearchParams(searchParams.toString())
    if (page === 1) {
      params.delete('page')
    } else {
      params.set('page', page.toString())
    }
    router.push(`/admin/companies${params.toString() ? `?${params.toString()}` : ''}`)
  }

  if (companies.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-8 text-center">
        <p className="text-slate-500">No companies found</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Company</TableHead>
              <TableHead>Tier</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Users</TableHead>
              <TableHead className="text-right">Employees</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {companies.map((company) => {
              const userCount = company.profiles?.[0]?.count || 0
              const employeeCount = company.employees?.[0]?.count || 0

              return (
                <TableRow key={company.id}>
                  <TableCell>
                    <Link
                      href={`/admin/companies/${company.id}`}
                      className="font-medium text-slate-900 hover:text-slate-600"
                    >
                      {company.name}
                    </Link>
                    <p className="text-xs text-slate-500">{company.slug}</p>
                  </TableCell>
                  <TableCell>
                    {getTierBadge(
                      company.company_entitlements?.tier_slug || null,
                      tierDisplayNameBySlug.get(company.company_entitlements?.tier_slug || 'free')
                    )}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(company.company_entitlements)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {userCount}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {employeeCount}
                  </TableCell>
                  <TableCell className="text-sm text-slate-500">
                    {company.created_at
                      ? formatDistanceToNow(parseISO(company.created_at), { addSuffix: true })
                      : '-'}
                  </TableCell>
                  <TableCell>
                    <Link href={`/admin/companies/${company.id}`}>
                      <Button variant="ghost" size="icon">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Page {currentPage} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateToPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
