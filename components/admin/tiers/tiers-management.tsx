'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  Archive,
  Check,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
  X,
} from 'lucide-react'
import type { TierRow } from '@/lib/admin/tier-admin'
import {
  TIER_FEATURE_FLAG_KEYS,
  TIER_FEATURE_LABELS,
  TIER_UNLIMITED_CAP,
} from '@/lib/constants/admin-tiers'
import type { CreateTierFormData, UpdateTierFormData } from '@/lib/validations/admin'
import {
  archiveTier,
  createTier,
  deleteTier,
  restoreTier,
  updateTier,
} from '@/app/admin/tiers/actions'
import { getTierDisplayName } from '@/lib/billing/plans'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const STRIPE_PRICE_PATTERN = /^price_[a-zA-Z0-9]+$/

function formatCap(n: number): string {
  return n >= TIER_UNLIMITED_CAP ? 'Unlimited' : n.toLocaleString()
}

function stripeFieldError(value: string): string | null {
  const t = value.trim()
  if (!t) return null
  if (!STRIPE_PRICE_PATTERN.test(t)) {
    return 'Must be a Stripe Price ID (price_…)'
  }
  return null
}

function tierToForm(tier: TierRow): Omit<UpdateTierFormData, 'is_active'> {
  return {
    display_name: tier.display_name,
    description: tier.description ?? null,
    max_employees: tier.max_employees,
    max_users: tier.max_users,
    can_export_csv: tier.can_export_csv === true,
    can_export_pdf: tier.can_export_pdf === true,
    can_forecast: tier.can_forecast === true,
    can_calendar: tier.can_calendar === true,
    can_bulk_import: tier.can_bulk_import === true,
    can_api_access: tier.can_api_access === true,
    can_sso: tier.can_sso === true,
    can_audit_logs: tier.can_audit_logs === true,
    stripe_price_id_monthly: tier.stripe_price_id_monthly,
    stripe_price_id_annual: tier.stripe_price_id_annual,
    sort_order: tier.sort_order ?? 0,
  }
}

function FeatureFlagsRow({ tier }: { tier: TierRow }) {
  return (
    <div className="flex flex-wrap gap-2">
      {TIER_FEATURE_FLAG_KEYS.map((key) => {
        const on = tier[key] === true
        return (
          <span
            key={key}
            title={TIER_FEATURE_LABELS[key]}
            className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white"
          >
            {on ? (
              <Check className="h-4 w-4 text-green-600" aria-label={TIER_FEATURE_LABELS[key]} />
            ) : (
              <X className="h-4 w-4 text-slate-300" aria-hidden />
            )}
          </span>
        )
      })}
    </div>
  )
}

const DEFAULT_FLAGS: Record<(typeof TIER_FEATURE_FLAG_KEYS)[number], boolean> = {
  can_export_csv: false,
  can_export_pdf: false,
  can_forecast: false,
  can_calendar: false,
  can_bulk_import: false,
  can_api_access: false,
  can_sso: false,
  can_audit_logs: false,
}

function getTierFormSeed(
  mode: 'create' | 'edit',
  tier: TierRow | null,
  nextSortOrder: number
) {
  if (mode === 'edit' && tier) {
    const f = tierToForm(tier)
    return {
      slug: '',
      displayName: f.display_name,
      description: f.description ?? '',
      maxEmployees: f.max_employees >= TIER_UNLIMITED_CAP ? 1 : f.max_employees,
      maxUsers: f.max_users >= TIER_UNLIMITED_CAP ? 1 : f.max_users,
      empUnlimited: f.max_employees >= TIER_UNLIMITED_CAP,
      userUnlimited: f.max_users >= TIER_UNLIMITED_CAP,
      sortOrder: f.sort_order ?? 0,
      flags: {
        can_export_csv: f.can_export_csv,
        can_export_pdf: f.can_export_pdf,
        can_forecast: f.can_forecast,
        can_calendar: f.can_calendar,
        can_bulk_import: f.can_bulk_import,
        can_api_access: f.can_api_access,
        can_sso: f.can_sso,
        can_audit_logs: f.can_audit_logs,
      },
      stripeMonthly: f.stripe_price_id_monthly ?? '',
      stripeAnnual: f.stripe_price_id_annual ?? '',
    }
  }
  return {
    slug: '',
    displayName: '',
    description: '',
    maxEmployees: 10,
    maxUsers: 5,
    empUnlimited: false,
    userUnlimited: false,
    sortOrder: nextSortOrder,
    flags: { ...DEFAULT_FLAGS },
    stripeMonthly: '',
    stripeAnnual: '',
  }
}

interface TierFormInnerProps {
  mode: 'create' | 'edit'
  tier: TierRow | null
  nextSortOrder: number
  onOpenChange: (open: boolean) => void
}

function TierFormFields({ mode, tier, nextSortOrder, onOpenChange }: TierFormInnerProps) {
  const seed = getTierFormSeed(mode, tier, nextSortOrder)
  const [isPending, startTransition] = useTransition()
  const [slug, setSlug] = useState(seed.slug)
  const [displayName, setDisplayName] = useState(seed.displayName)
  const [description, setDescription] = useState(seed.description)
  const [maxEmployees, setMaxEmployees] = useState(seed.maxEmployees)
  const [maxUsers, setMaxUsers] = useState(seed.maxUsers)
  const [empUnlimited, setEmpUnlimited] = useState(seed.empUnlimited)
  const [userUnlimited, setUserUnlimited] = useState(seed.userUnlimited)
  const [sortOrder, setSortOrder] = useState(seed.sortOrder)
  const [flags, setFlags] = useState(seed.flags)
  const [stripeMonthly, setStripeMonthly] = useState(seed.stripeMonthly)
  const [stripeAnnual, setStripeAnnual] = useState(seed.stripeAnnual)
  const [stripeMonthlyError, setStripeMonthlyError] = useState<string | null>(null)
  const [stripeAnnualError, setStripeAnnualError] = useState<string | null>(null)
  const [slugError, setSlugError] = useState<string | null>(null)

  const buildPayload = (): (CreateTierFormData | UpdateTierFormData) | null => {
    const me = empUnlimited ? TIER_UNLIMITED_CAP : maxEmployees
    const mu = userUnlimited ? TIER_UNLIMITED_CAP : maxUsers

    const smErr = stripeFieldError(stripeMonthly)
    const saErr = stripeFieldError(stripeAnnual)
    setStripeMonthlyError(smErr)
    setStripeAnnualError(saErr)
    if (smErr || saErr) return null

    const base: Omit<UpdateTierFormData, 'is_active'> = {
      display_name: displayName.trim(),
      description: description.trim() || null,
      max_employees: me,
      max_users: mu,
      can_export_csv: flags.can_export_csv,
      can_export_pdf: flags.can_export_pdf,
      can_forecast: flags.can_forecast,
      can_calendar: flags.can_calendar,
      can_bulk_import: flags.can_bulk_import,
      can_api_access: flags.can_api_access,
      can_sso: flags.can_sso,
      can_audit_logs: flags.can_audit_logs,
      stripe_price_id_monthly: stripeMonthly.trim() || null,
      stripe_price_id_annual: stripeAnnual.trim() || null,
      sort_order: sortOrder,
    }

    if (mode === 'create') {
      const normalised = slug.trim().toLowerCase()
      if (!normalised) {
        setSlugError('Slug is required')
        return null
      }
      setSlugError(null)
      return { ...base, slug: normalised, is_active: true } satisfies CreateTierFormData
    }

    if (!tier) return null
    return { ...base, is_active: tier.is_active === true } satisfies UpdateTierFormData
  }

  const handleSubmit = () => {
    const payload = buildPayload()
    if (!payload) return

    startTransition(async () => {
      if (mode === 'create') {
        const res = await createTier(payload as CreateTierFormData)
        if (!res.success) {
          toast.error(res.error)
          if (res.error.toLowerCase().includes('slug')) {
            setSlugError(res.error)
          }
          return
        }
        toast.success('Tier created')
        onOpenChange(false)
        return
      }

      if (!tier) return
      const res = await updateTier(tier.slug, payload as UpdateTierFormData)
      if (!res.success) {
        toast.error(res.error)
        return
      }
      toast.success('Tier updated')
      onOpenChange(false)
    })
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{mode === 'create' ? 'Create tier' : 'Edit tier'}</DialogTitle>
      </DialogHeader>

      <div className="flex flex-col gap-4 py-2">
          {mode === 'create' ? (
            <div className="flex flex-col gap-2">
              <Label htmlFor="tier-slug">Slug</Label>
              <Input
                id="tier-slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="rounded-xl"
                placeholder="e.g. growth"
                autoComplete="off"
              />
              {slugError ? <p className="text-sm text-red-600">{slugError}</p> : null}
              <p className="text-xs text-slate-500">
                Lowercase identifier. This cannot be changed after the tier is created.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <Label>Slug</Label>
              <div>
                <Badge variant="secondary" className="rounded-xl font-mono text-xs">
                  {tier?.slug}
                </Badge>
              </div>
              <p className="text-xs text-slate-500">The slug is fixed because other records reference it.</p>
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Label htmlFor="tier-name">Display name</Label>
            <Input
              id="tier-name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="rounded-xl"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="tier-desc">Description</Label>
            <Input
              id="tier-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="rounded-xl"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label>Max employees</Label>
              <Input
                type="number"
                min={1}
                max={TIER_UNLIMITED_CAP - 1}
                disabled={empUnlimited}
                value={empUnlimited ? '' : maxEmployees}
                placeholder={empUnlimited ? 'Unlimited' : undefined}
                onChange={(e) => setMaxEmployees(Number.parseInt(e.target.value, 10) || 1)}
                className="rounded-xl"
              />
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <Checkbox
                  checked={empUnlimited}
                  onCheckedChange={(c) => setEmpUnlimited(c === true)}
                />
                Unlimited ({TIER_UNLIMITED_CAP} stored)
              </label>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Max users</Label>
              <Input
                type="number"
                min={1}
                max={TIER_UNLIMITED_CAP - 1}
                disabled={userUnlimited}
                value={userUnlimited ? '' : maxUsers}
                placeholder={userUnlimited ? 'Unlimited' : undefined}
                onChange={(e) => setMaxUsers(Number.parseInt(e.target.value, 10) || 1)}
                className="rounded-xl"
              />
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <Checkbox
                  checked={userUnlimited}
                  onCheckedChange={(c) => setUserUnlimited(c === true)}
                />
                Unlimited ({TIER_UNLIMITED_CAP} stored)
              </label>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="tier-sort">Sort order</Label>
            <Input
              id="tier-sort"
              type="number"
              min={0}
              max={10000}
              value={sortOrder}
              onChange={(e) => setSortOrder(Number.parseInt(e.target.value, 10) || 0)}
              className="rounded-xl"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="stripe-m">Stripe monthly price ID</Label>
            <Input
              id="stripe-m"
              value={stripeMonthly}
              onChange={(e) => {
                setStripeMonthly(e.target.value)
                setStripeMonthlyError(stripeFieldError(e.target.value))
              }}
              className="rounded-xl font-mono text-sm"
              placeholder="price_…"
            />
            {stripeMonthlyError ? <p className="text-sm text-red-600">{stripeMonthlyError}</p> : null}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="stripe-a">Stripe annual price ID</Label>
            <Input
              id="stripe-a"
              value={stripeAnnual}
              onChange={(e) => {
                setStripeAnnual(e.target.value)
                setStripeAnnualError(stripeFieldError(e.target.value))
              }}
              className="rounded-xl font-mono text-sm"
              placeholder="price_…"
            />
            {stripeAnnualError ? <p className="text-sm text-red-600">{stripeAnnualError}</p> : null}
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-100 pt-4">
            <p className="text-sm font-medium text-slate-900">Feature flags</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {TIER_FEATURE_FLAG_KEYS.map((key) => (
                <label key={key} className="flex items-center gap-2 text-sm text-slate-700">
                  <Checkbox
                    checked={flags[key]}
                    onCheckedChange={(c) =>
                      setFlags((prev) => ({ ...prev, [key]: c === true }))
                    }
                  />
                  {TIER_FEATURE_LABELS[key]}
                </label>
              ))}
            </div>
          </div>
        </div>

      <DialogFooter className="gap-2 sm:gap-0">
        <Button type="button" variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button type="button" className="rounded-xl" disabled={isPending} onClick={handleSubmit}>
          {isPending ? 'Saving…' : 'Save'}
        </Button>
      </DialogFooter>
    </>
  )
}

interface TierFormDialogProps {
  mode: 'create' | 'edit'
  open: boolean
  onOpenChange: (open: boolean) => void
  tier: TierRow | null
  nextSortOrder: number
  instanceKey: number
}

function TierFormDialog({
  mode,
  open,
  onOpenChange,
  tier,
  nextSortOrder,
  instanceKey,
}: TierFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto rounded-xl sm:max-w-lg">
        {open ? (
          <TierFormFields
            key={instanceKey}
            mode={mode}
            tier={tier}
            nextSortOrder={nextSortOrder}
            onOpenChange={onOpenChange}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

export interface TiersManagementProps {
  tiers: TierRow[]
  companyCountBySlug: Record<string, number>
  activeTierCount: number
}

export function TiersManagement({ tiers, companyCountBySlug, activeTierCount }: TiersManagementProps) {
  const [createOpen, setCreateOpen] = useState(false)
  const [createInstanceKey, setCreateInstanceKey] = useState(0)
  const [editTier, setEditTier] = useState<TierRow | null>(null)
  const [editInstanceKey, setEditInstanceKey] = useState(0)
  const [confirmArchiveSlug, setConfirmArchiveSlug] = useState<string | null>(null)
  const [confirmDeleteSlug, setConfirmDeleteSlug] = useState<string | null>(null)
  const [busy, startTransition] = useTransition()

  const nextSortOrder = useMemo(() => {
    const max = tiers.reduce((m, t) => Math.max(m, t.sort_order ?? 0), 0)
    return max + 1
  }, [tiers])

  const archiveTarget = useMemo(
    () => tiers.find((t) => t.slug === confirmArchiveSlug) ?? null,
    [tiers, confirmArchiveSlug]
  )

  const deleteTarget = useMemo(
    () => tiers.find((t) => t.slug === confirmDeleteSlug) ?? null,
    [tiers, confirmDeleteSlug]
  )

  const runArchive = () => {
    if (!confirmArchiveSlug) return
    const slug = confirmArchiveSlug
    startTransition(async () => {
      const res = await archiveTier(slug)
      setConfirmArchiveSlug(null)
      if (!res.success) {
        toast.error(res.error)
        return
      }
      toast.success('Tier archived')
    })
  }

  const runDelete = () => {
    if (!confirmDeleteSlug) return
    const slug = confirmDeleteSlug
    startTransition(async () => {
      const res = await deleteTier(slug)
      setConfirmDeleteSlug(null)
      if (!res.success) {
        toast.error(res.error)
        return
      }
      toast.success('Tier deleted')
    })
  }

  const runRestore = (slug: string) => {
    startTransition(async () => {
      const res = await restoreTier(slug)
      if (!res.success) {
        toast.error(res.error)
        return
      }
      toast.success('Tier restored')
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div />
        <Button
          type="button"
          className="rounded-xl"
          onClick={() => {
            setCreateInstanceKey((k) => k + 1)
            setCreateOpen(true)
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          New tier
        </Button>
      </div>

      <Card className="rounded-xl border border-slate-200 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-base">All tiers</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead className="text-right">Max employees</TableHead>
                  <TableHead className="text-right">Max users</TableHead>
                  <TableHead>Features</TableHead>
                  <TableHead className="text-right">Companies</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[200px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tiers.map((tier) => {
                  const companies = companyCountBySlug[tier.slug] ?? 0
                  const archiveDisabled = tier.is_active === true && activeTierCount <= 1
                  const deleteDisabled = companies > 0

                  return (
                    <TableRow key={tier.slug}>
                      <TableCell className="font-medium text-slate-900">
                        {getTierDisplayName(tier.slug, tier.display_name)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="rounded-xl font-mono text-xs">
                          {tier.slug}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCap(tier.max_employees)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{formatCap(tier.max_users)}</TableCell>
                      <TableCell>
                        <FeatureFlagsRow tier={tier} />
                      </TableCell>
                      <TableCell className="text-right">
                        <Link
                          href={`/admin/companies?tier=${encodeURIComponent(tier.slug)}`}
                          className="text-sm font-medium text-slate-900 underline-offset-2 hover:underline"
                        >
                          {companies.toLocaleString()}
                        </Link>
                      </TableCell>
                      <TableCell>
                        {tier.is_active ? (
                          <Badge className="rounded-xl bg-green-50 text-green-800">Active</Badge>
                        ) : (
                          <Badge variant="secondary" className="rounded-xl">
                            Archived
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="rounded-xl"
                            onClick={() => {
                              setEditInstanceKey((k) => k + 1)
                              setEditTier(tier)
                            }}
                          >
                            <Pencil className="mr-1 h-3.5 w-3.5" />
                            Edit
                          </Button>

                          {tier.is_active ? (
                            archiveDisabled ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="inline-flex">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="rounded-xl"
                                      disabled
                                    >
                                      <Archive className="mr-1 h-3.5 w-3.5" />
                                      Archive
                                    </Button>
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  You cannot archive the only active tier. Restore or create another active tier
                                  first.
                                </TooltipContent>
                              </Tooltip>
                            ) : (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="rounded-xl"
                                disabled={busy}
                                onClick={() => setConfirmArchiveSlug(tier.slug)}
                              >
                                <Archive className="mr-1 h-3.5 w-3.5" />
                                Archive
                              </Button>
                            )
                          ) : (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="rounded-xl"
                              disabled={busy}
                              onClick={() => runRestore(tier.slug)}
                            >
                              <RotateCcw className="mr-1 h-3.5 w-3.5" />
                              Restore
                            </Button>
                          )}

                          {deleteDisabled ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="inline-flex">
                                  <Button type="button" variant="outline" size="sm" className="rounded-xl" disabled>
                                    <Trash2 className="mr-1 h-3.5 w-3.5" />
                                    Delete
                                  </Button>
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                {companies} compan{companies === 1 ? 'y is' : 'ies are'} still on this tier.
                                Reassign them before deleting.
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="rounded-xl text-red-700 hover:bg-red-50"
                              disabled={busy}
                              onClick={() => setConfirmDeleteSlug(tier.slug)}
                            >
                              <Trash2 className="mr-1 h-3.5 w-3.5" />
                              Delete
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <TierFormDialog
        mode="create"
        open={createOpen}
        onOpenChange={setCreateOpen}
        tier={null}
        nextSortOrder={nextSortOrder}
        instanceKey={createInstanceKey}
      />

      <TierFormDialog
        mode="edit"
        open={editTier !== null}
        onOpenChange={(o) => {
          if (!o) setEditTier(null)
        }}
        tier={editTier}
        nextSortOrder={nextSortOrder}
        instanceKey={editInstanceKey}
      />

      <AlertDialog open={!!confirmArchiveSlug} onOpenChange={(o) => !o && setConfirmArchiveSlug(null)}>
        <AlertDialogContent className="rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Archive tier?</AlertDialogTitle>
            <AlertDialogDescription>
              {archiveTarget
                ? `Companies on "${getTierDisplayName(archiveTarget.slug, archiveTarget.display_name)}" keep their entitlements; the tier will be hidden from new assignments where you filter by active tiers.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction className="rounded-xl" onClick={runArchive}>
              Archive tier
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!confirmDeleteSlug} onOpenChange={(o) => !o && setConfirmDeleteSlug(null)}>
        <AlertDialogContent className="rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete tier permanently?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `This will remove "${getTierDisplayName(deleteTarget.slug, deleteTarget.display_name)}" from the database. This cannot be undone.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-red-600 hover:bg-red-600/90"
              onClick={runDelete}
            >
              Delete tier
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
