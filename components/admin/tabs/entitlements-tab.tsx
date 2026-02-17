'use client'

import { useState, useTransition } from 'react'
import { format, parseISO } from 'date-fns'
import { toast } from 'sonner'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { AlertTriangle, ArrowRight, Clock, Pause, Play } from 'lucide-react'
import {
  changeTier,
  extendTrial,
  convertTrial,
  suspendCompany,
  restoreCompany,
} from '@/app/admin/companies/[id]/actions'
import { getTierDisplayName, getPlanBySlug } from '@/lib/billing/plans'

interface EntitlementsTabProps {
  company: {
    id: string
    name: string
    company_entitlements: {
      id: string
      tier_slug: string | null
      max_employees: number | null
      max_users: number | null
      can_export_csv: boolean | null
      can_export_pdf: boolean | null
      can_forecast: boolean | null
      can_calendar: boolean | null
      can_bulk_import: boolean | null
      can_api_access: boolean | null
      can_sso: boolean | null
      can_audit_logs: boolean | null
      is_trial: boolean | null
      trial_ends_at: string | null
      is_suspended: boolean | null
      suspended_at: string | null
      suspended_reason: string | null
      manual_override: boolean | null
      override_notes: string | null
    } | null
  }
  tier: {
    slug: string
    display_name: string
    max_employees: number
    max_users: number
  } | null
  tiers: Array<{
    slug: string
    display_name: string
  }>
}

export function EntitlementsTab({ company, tier: _tier, tiers }: EntitlementsTabProps) {
  const [isPending, startTransition] = useTransition()
  const [trialDays, setTrialDays] = useState('7')
  const [trialReason, setTrialReason] = useState('')
  const [suspendReason, setSuspendReason] = useState('')
  const [showSuspendDialog, setShowSuspendDialog] = useState(false)
  const [showRestoreDialog, setShowRestoreDialog] = useState(false)
  const [showExtendDialog, setShowExtendDialog] = useState(false)
  const [showConvertDialog, setShowConvertDialog] = useState(false)
  const [pendingTierSlug, setPendingTierSlug] = useState<string | null>(null)
  const [showTierChangeDialog, setShowTierChangeDialog] = useState(false)

  const entitlement = company.company_entitlements

  const currentPlan = getPlanBySlug(entitlement?.tier_slug)
  const pendingPlan = getPlanBySlug(pendingTierSlug)

  const handleTierSelectChange = (newTier: string) => {
    if (newTier === entitlement?.tier_slug) return
    setPendingTierSlug(newTier)
    setShowTierChangeDialog(true)
  }

  const handleTierChangeConfirm = () => {
    if (!pendingTierSlug) return
    startTransition(async () => {
      const result = await changeTier(company.id, pendingTierSlug)
      if (result.success) {
        toast.success(`Tier changed to ${getTierDisplayName(pendingTierSlug)}`)
        setShowTierChangeDialog(false)
        setPendingTierSlug(null)
      } else {
        toast.error(result.error || 'Failed to update tier')
      }
    })
  }

  const handleExtendTrial = () => {
    const days = parseInt(trialDays)
    if (isNaN(days) || days < 1) {
      toast.error('Please enter a valid number of days')
      return
    }

    startTransition(async () => {
      const result = await extendTrial(company.id, days, trialReason)
      if (result.success) {
        toast.success(`Trial extended by ${days} days`)
        setShowExtendDialog(false)
        setTrialDays('7')
        setTrialReason('')
      } else {
        toast.error(result.error || 'Failed to extend trial')
      }
    })
  }

  const handleConvertTrial = () => {
    startTransition(async () => {
      const result = await convertTrial(company.id)
      if (result.success) {
        toast.success('Trial converted to paid')
        setShowConvertDialog(false)
      } else {
        toast.error(result.error || 'Failed to convert trial')
      }
    })
  }

  const handleSuspend = () => {
    if (!suspendReason.trim()) {
      toast.error('Please provide a reason for suspension')
      return
    }

    startTransition(async () => {
      const result = await suspendCompany(company.id, suspendReason)
      if (result.success) {
        toast.success('Company suspended')
        setShowSuspendDialog(false)
        setSuspendReason('')
      } else {
        toast.error(result.error || 'Failed to suspend company')
      }
    })
  }

  const handleRestore = () => {
    startTransition(async () => {
      const result = await restoreCompany(company.id)
      if (result.success) {
        toast.success('Company restored')
        setShowRestoreDialog(false)
      } else {
        toast.error(result.error || 'Failed to restore company')
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Tier Management */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Subscription Tier</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Label>Current Tier</Label>
              <Select
                value={entitlement?.tier_slug || 'free'}
                onValueChange={handleTierSelectChange}
                disabled={isPending}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {tiers.map((t) => (
                    <SelectItem key={t.slug} value={t.slug}>
                      {getTierDisplayName(t.slug, t.display_name)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {entitlement?.manual_override && (
            <p className="text-xs text-amber-600">
              This company has manually overridden entitlements. Changing the tier will reset them to the new tier defaults.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Tier Change Confirmation Dialog */}
      <Dialog
        open={showTierChangeDialog}
        onOpenChange={(open) => {
          setShowTierChangeDialog(open)
          if (!open) setPendingTierSlug(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Subscription Tier</DialogTitle>
            <DialogDescription>
              This will update {company.name}&apos;s tier and sync all entitlements to the new tier defaults.
            </DialogDescription>
          </DialogHeader>
          {currentPlan && pendingPlan && (
            <div className="py-4 space-y-4">
              <div className="flex items-center justify-center gap-3 text-sm">
                <span className="font-medium">{currentPlan.publicName}</span>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{pendingPlan.publicName}</span>
              </div>
              <div className="rounded-lg border p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Employees</span>
                  <span>
                    {currentPlan.employeeCap ?? 'Unlimited'}
                    {' \u2192 '}
                    {pendingPlan.employeeCap ?? 'Unlimited'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Users</span>
                  <span>
                    {currentPlan.userCap ?? 'Unlimited'}
                    {' \u2192 '}
                    {pendingPlan.userCap ?? 'Unlimited'}
                  </span>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowTierChangeDialog(false)
                setPendingTierSlug(null)
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleTierChangeConfirm} disabled={isPending}>
              {isPending ? 'Changing...' : 'Confirm Tier Change'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Trial Management */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Trial Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {entitlement?.is_trial ? (
            <>
              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-blue-900">Trial Active</p>
                  <p className="text-sm text-blue-700">
                    Expires {entitlement.trial_ends_at
                      ? format(parseISO(entitlement.trial_ends_at), 'MMMM d, yyyy')
                      : 'Unknown'}
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <Dialog open={showExtendDialog} onOpenChange={setShowExtendDialog}>
                  <DialogTrigger asChild>
                    <Button variant="outline">Extend Trial</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Extend Trial</DialogTitle>
                      <DialogDescription>
                        Extend the trial period for {company.name}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label>Days to add</Label>
                        <Input
                          type="number"
                          min="1"
                          value={trialDays}
                          onChange={(e) => setTrialDays(e.target.value)}
                          placeholder="7"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Reason (optional)</Label>
                        <Input
                          value={trialReason}
                          onChange={(e) => setTrialReason(e.target.value)}
                          placeholder="e.g., Customer requested more time to evaluate"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowExtendDialog(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleExtendTrial} disabled={isPending}>
                        {isPending ? 'Extending...' : 'Extend Trial'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Dialog open={showConvertDialog} onOpenChange={setShowConvertDialog}>
                  <DialogTrigger asChild>
                    <Button>Convert to Paid</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Convert to Paid</DialogTitle>
                      <DialogDescription>
                        This will mark {company.name} as a paid customer and remove the trial period.
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowConvertDialog(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleConvertTrial} disabled={isPending}>
                        {isPending ? 'Converting...' : 'Convert to Paid'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </>
          ) : (
            <div className="p-4 bg-green-50 rounded-lg">
              <p className="text-sm font-medium text-green-900">Paid Customer</p>
              <p className="text-sm text-green-700">This company is not on a trial</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Suspend/Restore */}
      <Card className={entitlement?.is_suspended ? 'border-red-200' : ''}>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Account Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          {entitlement?.is_suspended ? (
            <div className="space-y-4">
              <div className="p-4 bg-red-50 rounded-lg">
                <p className="text-sm font-medium text-red-900">Account Suspended</p>
                {entitlement.suspended_at && (
                  <p className="text-sm text-red-700">
                    Suspended on {format(parseISO(entitlement.suspended_at), 'MMMM d, yyyy')}
                  </p>
                )}
                {entitlement.suspended_reason && (
                  <p className="text-sm text-red-700 mt-1">
                    Reason: {entitlement.suspended_reason}
                  </p>
                )}
              </div>
              <Dialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
                <DialogTrigger asChild>
                  <Button className="bg-green-600 hover:bg-green-700">
                    <Play className="h-4 w-4 mr-2" />
                    Restore Account
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Restore Account</DialogTitle>
                    <DialogDescription>
                      This will restore full access for {company.name}. Are you sure?
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowRestoreDialog(false)}>
                      Cancel
                    </Button>
                    <Button
                      className="bg-green-600 hover:bg-green-700"
                      onClick={handleRestore}
                      disabled={isPending}
                    >
                      {isPending ? 'Restoring...' : 'Restore Account'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="text-sm font-medium text-slate-900">Account Active</p>
                <p className="text-sm text-slate-600">This company has full access</p>
              </div>
              <Dialog open={showSuspendDialog} onOpenChange={setShowSuspendDialog}>
                <DialogTrigger asChild>
                  <Button variant="destructive">
                    <Pause className="h-4 w-4 mr-2" />
                    Suspend Account
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Suspend Account</DialogTitle>
                    <DialogDescription>
                      This will prevent {company.name} from accessing the platform.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4">
                    <Label>Reason for suspension</Label>
                    <Input
                      className="mt-1.5"
                      value={suspendReason}
                      onChange={(e) => setSuspendReason(e.target.value)}
                      placeholder="e.g., Non-payment, Terms violation"
                    />
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowSuspendDialog(false)}>
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleSuspend}
                      disabled={isPending || !suspendReason.trim()}
                    >
                      {isPending ? 'Suspending...' : 'Suspend Account'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
