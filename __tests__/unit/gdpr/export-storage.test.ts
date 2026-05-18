import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { createAdminClientMock } = vi.hoisted(() => ({
  createAdminClientMock: vi.fn(),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: createAdminClientMock,
}))

describe('GDPR export storage', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-18T10:30:00.000Z'))
  })

  it('stores DSAR archives in a private bucket with a short-lived signed URL', async () => {
    const uploadMock = vi.fn().mockResolvedValue({ error: null })
    const createSignedUrlMock = vi.fn().mockResolvedValue({
      data: {
        signedUrl: 'https://storage.example/export.zip?token=abc',
      },
      error: null,
    })

    createAdminClientMock.mockReturnValue({
      storage: {
        from: vi.fn(() => ({
          upload: uploadMock,
          createSignedUrl: createSignedUrlMock,
        })),
      },
    })

    const { storeGdprExportArchive, GDPR_EXPORT_SIGNED_URL_TTL_SECONDS } = await import(
      '@/lib/gdpr/export-storage'
    )
    const result = await storeGdprExportArchive(Buffer.from('zip-data'), 'DSAR Export.zip')

    expect(uploadMock).toHaveBeenCalledTimes(1)
    expect(createSignedUrlMock).toHaveBeenCalledWith(
      expect.stringContaining('DSAR_Export.zip'),
      GDPR_EXPORT_SIGNED_URL_TTL_SECONDS
    )
    expect(result.signedUrl).toBe('https://storage.example/export.zip?token=abc')
  })

  it('removes expired DSAR archives from the private bucket', async () => {
    const listMock = vi
      .fn()
      .mockResolvedValueOnce({
        data: [
          { name: '1779103800000_keep.zip' },
          { name: '1747391400000_delete.zip' },
        ],
        error: null,
      })
      .mockResolvedValueOnce({
        data: [],
        error: null,
      })
    const removeMock = vi.fn().mockResolvedValue({ error: null })

    createAdminClientMock.mockReturnValue({
      storage: {
        from: vi.fn(() => ({
          list: listMock,
          remove: removeMock,
        })),
      },
    })

    const { cleanupExpiredGdprExportArchives } = await import('@/lib/gdpr/export-storage')
    const result = await cleanupExpiredGdprExportArchives(24)

    expect(removeMock).toHaveBeenCalledWith(['1747391400000_delete.zip'])
    expect(result.deletedCount).toBe(1)
  })
})
