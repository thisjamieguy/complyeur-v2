"use client"

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Shield, Smartphone, Key, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  enrollTotpAction,
  generateBackupCodesAction,
  getMfaStatusAction,
  verifyBackupCodeAction,
  verifyTotpAction,
} from '@/lib/actions/mfa'

type EnrollData = { factorId: string; qrCode: string; secret: string }

export function MfaEnrollmentPanel({ required = false }: { required?: boolean }) {
  const router = useRouter()
  const [status, setStatus] = useState<Awaited<ReturnType<typeof getMfaStatusAction>> | null>(null)
  const [enrollData, setEnrollData] = useState<EnrollData | null>(null)
  const [totpCode, setTotpCode] = useState('')
  const [backupCode, setBackupCode] = useState('')
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null)
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
      loadStatus()
    })
  }

  if (!status) {
    return <div className="text-sm text-slate-500">Loading MFA status...</div>
  }

  if (!status.success) {
    return <div className="text-sm text-red-600">{status.error}</div>
  }

  const isVerified = status.currentLevel === 'aal2' || status.backupSessionValid
  const needsEnrollment = !status.hasVerifiedFactor

  return (
    <div className="space-y-4">
      {required && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          MFA is required for this account. Complete enrollment and verification to continue.
        </div>
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
                <img src={enrollData.qrCode} alt="MFA QR code" className="h-32 w-32" />
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
            <Button variant="outline" onClick={handleVerifyBackupCode} disabled={isPending || !backupCode}>
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
            <div className="text-xs text-slate-500">
              {status.backupCodesRemaining} remaining
            </div>
          </div>
          <div className="text-sm text-slate-600">
            Generate single-use backup codes for account recovery.
          </div>
          <Button variant="outline" size="sm" onClick={handleGenerateBackupCodes} disabled={isPending}>
            {status.backupCodesRemaining > 0 ? 'Regenerate Codes' : 'Generate Codes'}
          </Button>

          {backupCodes && (
            <div className="mt-3 rounded-lg border bg-slate-50 p-3 text-sm">
              <div className="font-medium text-slate-900">Save these codes now:</div>
              <div className="mt-2 grid grid-cols-2 gap-2 font-mono text-xs">
                {backupCodes.map((code) => (
                  <div key={code} className="rounded border bg-white px-2 py-1 text-center">
                    {code}
                  </div>
                ))}
              </div>
              <div className="mt-2 text-xs text-slate-500">
                These codes will not be shown again.
              </div>
            </div>
          )}
        </div>
      )}

      {required && isVerified && (
        <div className="pt-4 border-t">
          <Button
            onClick={() => router.push('/dashboard')}
            className="w-full"
            size="lg"
          >
            Continue to Dashboard
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
