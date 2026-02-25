"use client"

import { useEffect, useState, useTransition } from 'react'
import { Shield, Smartphone, Key, ArrowRight, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  enrollTotpAction,
  generateBackupCodesAction,
  getMfaStatusAction,
  unenrollTotpAction,
  verifyBackupCodeAction,
  verifyTotpAction,
} from '@/lib/actions/mfa'

type EnrollData = { factorId: string; qrCode: string; secret: string }
type ResetProofMethod = 'totp' | 'backup'

function downloadBackupCodesFile(codes: string[]): void {
  const content = [
    'ComplyEur Backup Codes',
    `Generated: ${new Date().toISOString()}`,
    '',
    ...codes,
    '',
    'Each code can be used once.',
  ].join('\n')

  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `complyeur-backup-codes-${new Date().toISOString().slice(0, 10)}.txt`
  anchor.click()
  URL.revokeObjectURL(url)
}

export function MfaEnrollmentPanel({ required = false }: { required?: boolean }) {
  const [status, setStatus] = useState<Awaited<ReturnType<typeof getMfaStatusAction>> | null>(null)
  const [enrollData, setEnrollData] = useState<EnrollData | null>(null)
  const [totpCode, setTotpCode] = useState('')
  const [backupCode, setBackupCode] = useState('')
  const [resetTotpCode, setResetTotpCode] = useState('')
  const [resetBackupCode, setResetBackupCode] = useState('')
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null)
  const [backupCodesDownloaded, setBackupCodesDownloaded] = useState(false)
  const [backupCodesAcknowledged, setBackupCodesAcknowledged] = useState(false)
  const [isPending, startTransition] = useTransition()

  const loadStatus = () => {
    startTransition(async () => {
      const result = await getMfaStatusAction()
      setStatus(result)
    })
  }

  useEffect(() => {
    loadStatus()
  }, [])

  // Auto-start enrollment when MFA is required but not yet set up.
  useEffect(() => {
    if (required && status?.success && !status.hasVerifiedFactor && !enrollData) {
      handleEnroll()
    }
  }, [required, status, enrollData])

  useEffect(() => {
    if (!backupCodes || !status?.success) return
    if (status.backupCodesRemaining !== backupCodes.length) {
      setBackupCodes(null)
      setBackupCodesDownloaded(false)
      setBackupCodesAcknowledged(false)
    }
  }, [backupCodes, status])

  const handleEnroll = () => {
    startTransition(async () => {
      const result = await enrollTotpAction()
      if (!result.success) {
        toast.error(result.error)
        return
      }
      setEnrollData(result)
      toast.info('Scan the QR code and enter your 6-digit code to verify.')
    })
  }

  const handleVerifyTotp = () => {
    const factorId = enrollData?.factorId ?? (status?.success ? status.totpFactorId : null)
    if (!factorId) {
      toast.error('No MFA factor available')
      return
    }

    startTransition(async () => {
      const result = await verifyTotpAction(factorId, totpCode)
      if (!result.success) {
        toast.error(result.error)
        return
      }
      toast.success('MFA verified')
      setTotpCode('')
      setEnrollData(null)
      setBackupCodes(null)
      setBackupCodesDownloaded(false)
      setBackupCodesAcknowledged(false)
      loadStatus()
    })
  }

  const handleGenerateBackupCodes = () => {
    startTransition(async () => {
      const result = await generateBackupCodesAction()
      if (!result.success) {
        toast.error(result.error)
        return
      }
      setBackupCodes(result.codes)
      setBackupCodesDownloaded(false)
      setBackupCodesAcknowledged(false)
      toast.success('Backup codes generated')
      loadStatus()
    })
  }

  const handleVerifyBackupCode = () => {
    startTransition(async () => {
      const result = await verifyBackupCodeAction(backupCode)
      if (!result.success) {
        toast.error(result.error)
        return
      }
      toast.success('Backup code accepted')
      setBackupCode('')
      setBackupCodes(null)
      setBackupCodesDownloaded(false)
      setBackupCodesAcknowledged(false)
      loadStatus()
    })
  }

  const handleResetMfa = (method: ResetProofMethod) => {
    const proofCode = method === 'totp' ? resetTotpCode : resetBackupCode
    if (!proofCode.trim()) {
      toast.error(
        method === 'totp'
          ? 'Enter a current authenticator code to reset MFA.'
          : 'Enter a backup code to reset MFA.'
      )
      return
    }

    startTransition(async () => {
      const result = await unenrollTotpAction(method, proofCode)
      if (!result.success) {
        toast.error(result.error)
        return
      }

      toast.info('MFA reset. Enroll again to set up a new authenticator and backup codes.')
      setEnrollData(null)
      setBackupCodes(null)
      setBackupCodesDownloaded(false)
      setBackupCodesAcknowledged(false)
      setTotpCode('')
      setBackupCode('')
      setResetTotpCode('')
      setResetBackupCode('')
      loadStatus()
    })
  }

  const handleDownloadBackupCodes = () => {
    if (!backupCodes || backupCodes.length === 0) return
    downloadBackupCodesFile(backupCodes)
    setBackupCodesDownloaded(true)
    toast.success('Backup codes downloaded')
  }

  if (!status) {
    return <div className="text-sm text-slate-500">Loading MFA status...</div>
  }

  if (!status.success) {
    return <div className="text-sm text-red-600">{status.error}</div>
  }

  const isVerified = status.currentLevel === 'aal2' || status.backupSessionValid
  const needsEnrollment = !status.hasVerifiedFactor
  const requiresBackupCodesBeforeContinue =
    required && isVerified && status.backupCodesRemaining < 1
  const requiresBackupCodeConfirmationBeforeContinue =
    required &&
    isVerified &&
    Boolean(backupCodes) &&
    (!backupCodesDownloaded || !backupCodesAcknowledged)
  const canContinueToDashboard =
    required &&
    isVerified &&
    !requiresBackupCodesBeforeContinue &&
    !requiresBackupCodeConfirmationBeforeContinue

  return (
    <div className="space-y-4">
      {required && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          MFA is required for this account. Complete enrollment, verification, and backup-code
          recovery setup to continue.
        </div>
      )}

      {status.backupCodesRemaining === 0 && status.hasVerifiedFactor && (
        <Alert className="border-amber-300 bg-amber-50 text-amber-900">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            You have no backup codes remaining. Generate new codes now to avoid account lockout.
          </AlertDescription>
        </Alert>
      )}

      {status.backupCodesRemaining > 0 &&
        status.backupCodesRemaining <= 3 &&
        status.hasVerifiedFactor && (
          <Alert className="border-amber-300 bg-amber-50 text-amber-900">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Only {status.backupCodesRemaining} backup code
              {status.backupCodesRemaining === 1 ? '' : 's'} remaining. Regenerate and store a fresh
              set.
            </AlertDescription>
          </Alert>
        )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-green-600" />
          <div className="text-base font-medium">Authenticator App (TOTP)</div>
          {status.hasVerifiedFactor && (
            <Badge variant="default" className={isVerified ? 'bg-green-600' : 'bg-amber-500'}>
              {isVerified ? 'Verified' : 'Pending'}
            </Badge>
          )}
        </div>
        {!status.hasVerifiedFactor && (
          <Button onClick={handleEnroll} disabled={isPending}>
            Enroll MFA
          </Button>
        )}
      </div>

      {needsEnrollment && enrollData && (
        <div className="rounded-lg border p-4 bg-slate-50 space-y-3">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-white rounded-md border">
              <Smartphone className="h-6 w-6 text-slate-600" />
            </div>
            <div className="space-y-2">
              <div className="text-sm text-slate-700">
                Scan this QR code with Google Authenticator, 1Password, or Authy.
              </div>
              <div className="bg-white p-3 rounded border inline-block">
                {/* eslint-disable-next-line @next/next/no-img-element -- Supabase returns a data URI QR code for MFA enrollment */}
                <img
                  src={enrollData.qrCode}
                  alt="MFA QR code"
                  width={128}
                  height={128}
                  className="h-32 w-32"
                />
              </div>
              <div className="text-xs text-slate-500">Secret: {enrollData.secret}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Input
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value)}
              placeholder="Enter 6-digit code"
              className="max-w-[180px]"
            />
            <Button onClick={handleVerifyTotp} disabled={isPending || !totpCode}>
              Verify
            </Button>
          </div>
        </div>
      )}

      {!needsEnrollment && !isVerified && (
        <div className="rounded-lg border p-4 bg-slate-50 space-y-3">
          <div className="text-sm text-slate-700">
            Enter a code from your authenticator app to complete MFA verification.
          </div>
          <div className="flex items-center gap-2">
            <Input
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value)}
              placeholder="6-digit code"
              className="max-w-[180px]"
            />
            <Button onClick={handleVerifyTotp} disabled={isPending || !totpCode}>
              Verify
            </Button>
          </div>

          <Separator />

          <div className="text-sm text-slate-700">Or use a backup code:</div>
          <div className="flex items-center gap-2">
            <Input
              value={backupCode}
              onChange={(e) => setBackupCode(e.target.value)}
              placeholder="ABCD-EFGH"
              className="max-w-[180px]"
            />
            <Button
              variant="outline"
              onClick={handleVerifyBackupCode}
              disabled={isPending || !backupCode}
            >
              Use Backup Code
            </Button>
          </div>
        </div>
      )}

      {!needsEnrollment && (
        <div className="rounded-lg border p-4 bg-white space-y-2">
          <div className="flex items-center gap-2">
            <Key className="h-4 w-4 text-slate-600" />
            <div className="text-sm font-medium">Backup Codes</div>
            <div className="text-xs text-slate-500">{status.backupCodesRemaining} remaining</div>
          </div>
          <div className="text-sm text-slate-600">
            Generate single-use backup codes for account recovery.
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleGenerateBackupCodes}
            disabled={isPending || !isVerified}
          >
            {status.backupCodesRemaining > 0 ? 'Regenerate Codes' : 'Generate Codes'}
          </Button>
          {!isVerified && (
            <div className="text-xs text-slate-500">
              Verify MFA in this session before generating or regenerating backup codes.
            </div>
          )}

          {backupCodes && (
            <div className="mt-3 rounded-lg border bg-slate-50 p-3 text-sm space-y-3">
              <div className="font-medium text-slate-900">Save these codes now:</div>
              <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                {backupCodes.map((codeItem) => (
                  <div key={codeItem} className="rounded border bg-white px-2 py-1 text-center">
                    {codeItem}
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleDownloadBackupCodes}
                  disabled={isPending}
                >
                  Download Codes
                </Button>
                <div className="text-xs text-slate-500">These codes will not be shown again.</div>
              </div>
              <div className="flex items-start gap-2 rounded border border-slate-200 bg-white p-2">
                <Checkbox
                  id="backup-codes-confirmed"
                  checked={backupCodesAcknowledged}
                  onCheckedChange={(checked) => setBackupCodesAcknowledged(checked === true)}
                />
                <Label htmlFor="backup-codes-confirmed" className="text-xs leading-relaxed text-slate-600">
                  I have saved these backup codes in a secure location.
                </Label>
              </div>
            </div>
          )}
        </div>
      )}

      {!needsEnrollment && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 space-y-3">
          <div className="text-sm font-medium text-red-900">
            Lost access to your authenticator app? Reset and re-enroll.
          </div>
          <div className="text-xs text-red-800">
            Resetting MFA requires proof of possession. Provide either a current TOTP code or a
            backup code.
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="reset-totp-code" className="text-xs text-red-900">
                Current authenticator code
              </Label>
              <Input
                id="reset-totp-code"
                value={resetTotpCode}
                onChange={(event) => setResetTotpCode(event.target.value)}
                placeholder="6-digit code"
                className="max-w-[220px]"
              />
              <Button
                variant="destructive"
                size="sm"
                disabled={isPending || !resetTotpCode}
                onClick={() => handleResetMfa('totp')}
              >
                Reset with TOTP
              </Button>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reset-backup-code" className="text-xs text-red-900">
                Backup code
              </Label>
              <Input
                id="reset-backup-code"
                value={resetBackupCode}
                onChange={(event) => setResetBackupCode(event.target.value)}
                placeholder="ABCD-EFGH"
                className="max-w-[220px]"
              />
              <Button
                variant="destructive"
                size="sm"
                disabled={isPending || !resetBackupCode}
                onClick={() => handleResetMfa('backup')}
              >
                Reset with Backup Code
              </Button>
            </div>
          </div>
        </div>
      )}

      {required && (
        <div className="pt-4 border-t">
          <Button
            onClick={() => {
              // Full page reload ensures AAL2 session cookies are sent on the next request.
              window.location.href = '/dashboard'
            }}
            className="w-full"
            size="lg"
            disabled={!canContinueToDashboard}
          >
            Continue to Dashboard
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          {!canContinueToDashboard && (
            <p className="mt-2 text-xs text-amber-700">
              {requiresBackupCodesBeforeContinue
                ? 'Generate backup codes to complete MFA setup.'
                : 'Download your new backup codes and confirm they are saved before continuing.'}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
