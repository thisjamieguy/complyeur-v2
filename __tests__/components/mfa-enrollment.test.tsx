// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { MfaEnrollmentPanel } from '@/components/mfa/mfa-enrollment'
import {
  enrollTotpAction,
  generateBackupCodesAction,
  getMfaStatusAction,
  unenrollTotpAction,
  verifyBackupCodeAction,
  verifyTotpAction,
} from '@/lib/actions/mfa'

vi.mock('@/lib/actions/mfa', () => ({
  enrollTotpAction: vi.fn(),
  generateBackupCodesAction: vi.fn(),
  getMfaStatusAction: vi.fn(),
  unenrollTotpAction: vi.fn(),
  verifyBackupCodeAction: vi.fn(),
  verifyTotpAction: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    info: vi.fn(),
    success: vi.fn(),
  },
}))

const enrollmentSecret = 'MAGJXR6DCNPJIAN2FO7YA4XXAM2K2KFLI'

describe('MfaEnrollmentPanel', () => {
  beforeEach(() => {
    vi.mocked(getMfaStatusAction).mockResolvedValue({
      success: true,
      userId: 'user-1',
      currentLevel: 'aal1',
      nextLevel: 'aal2',
      hasVerifiedFactor: false,
      backupSessionValid: false,
      backupCodesRemaining: 0,
      totpFactorId: null,
    })
    vi.mocked(enrollTotpAction).mockResolvedValue({
      success: true,
      factorId: 'factor-1',
      qrCode: 'data:image/svg+xml,%3Csvg%20/%3E',
      secret: enrollmentSecret,
    })
    vi.mocked(generateBackupCodesAction).mockResolvedValue({
      success: true,
      codes: [],
    })
    vi.mocked(unenrollTotpAction).mockResolvedValue({ success: true })
    vi.mocked(verifyBackupCodeAction).mockResolvedValue({ success: true })
    vi.mocked(verifyTotpAction).mockResolvedValue({ success: true })
  })

  it('hides the TOTP setup key unless the user explicitly reveals it', async () => {
    render(<MfaEnrollmentPanel />)

    fireEvent.click(await screen.findByRole('button', { name: /enroll mfa/i }))

    await waitFor(() => {
      expect(screen.getByText(/manual setup key/i)).toBeInTheDocument()
    })
    expect(screen.queryByText(enrollmentSecret)).not.toBeInTheDocument()
    expect(screen.queryByText(/secret:/i)).not.toBeInTheDocument()
    expect(screen.getByText(/hidden until needed/i)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /show key/i }))

    expect(screen.getByText(enrollmentSecret)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /hide key/i })).toBeInTheDocument()
  })

  it('shows the verification step before backup-code instructions in the required flow', async () => {
    render(<MfaEnrollmentPanel required />)

    await waitFor(() => {
      expect(screen.getByText(/manual setup key/i)).toBeInTheDocument()
    })

    expect(screen.queryByRole('button', { name: /enroll mfa/i })).not.toBeInTheDocument()
    expect(
      screen.getByText(/scan the qr code and enter your 6-digit authenticator code to continue/i)
    ).toBeInTheDocument()
    expect(screen.queryByText(/download your new backup codes/i)).not.toBeInTheDocument()
  })
})
