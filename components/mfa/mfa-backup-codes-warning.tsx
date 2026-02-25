"use client"

import { useEffect } from 'react'
import { toast } from 'sonner'

import { getMfaStatusAction } from '@/lib/actions/mfa'

const WARNING_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000
const LOW_BACKUP_CODE_THRESHOLD = 3
const EMPTY_WARNING_STORAGE_KEY = 'mfa_backup_codes_empty_warning_last_shown_at'
const LOW_WARNING_STORAGE_KEY = 'mfa_backup_codes_low_warning_last_shown_at'

function shouldShowWarning(storageKey: string): boolean {
  try {
    const rawValue = window.localStorage.getItem(storageKey)
    const lastShownAt = rawValue ? Number(rawValue) : 0
    if (Number.isNaN(lastShownAt) || lastShownAt <= 0) return true
    return Date.now() - lastShownAt >= WARNING_INTERVAL_MS
  } catch {
    return true
  }
}

function markWarningShown(storageKey: string): void {
  try {
    window.localStorage.setItem(storageKey, String(Date.now()))
  } catch {
    // Ignore storage failures and keep the warning non-blocking.
  }
}

export function MfaBackupCodesWarning() {
  useEffect(() => {
    let cancelled = false

    const checkBackupCodes = async () => {
      const status = await getMfaStatusAction()
      if (cancelled || !status.success || !status.hasVerifiedFactor) return

      const remainingCodes = status.backupCodesRemaining
      const emptyWarningStorageKey = `${EMPTY_WARNING_STORAGE_KEY}:${status.userId}`
      const lowWarningStorageKey = `${LOW_WARNING_STORAGE_KEY}:${status.userId}`

      if (remainingCodes === 0) {
        if (!shouldShowWarning(emptyWarningStorageKey)) return
        markWarningShown(emptyWarningStorageKey)
        toast.warning(
          'No MFA backup codes remaining. Open Security settings and generate a new recovery set.'
        )
        return
      }

      if (remainingCodes <= LOW_BACKUP_CODE_THRESHOLD) {
        if (!shouldShowWarning(lowWarningStorageKey)) return
        markWarningShown(lowWarningStorageKey)
        toast.warning(
          `Only ${remainingCodes} MFA backup code${remainingCodes === 1 ? '' : 's'} remaining. Regenerate a fresh set soon.`
        )
      }
    }

    void checkBackupCodes()

    return () => {
      cancelled = true
    }
  }, [])

  return null
}
