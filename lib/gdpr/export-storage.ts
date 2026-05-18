import { createAdminClient } from '@/lib/supabase/admin'

export const GDPR_EXPORT_BUCKET = 'gdpr-exports'
export const GDPR_EXPORT_SIGNED_URL_TTL_SECONDS = 600
export const GDPR_EXPORT_RETENTION_HOURS = 24

function sanitizeExportFileName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
}

export async function storeGdprExportArchive(
  zipBuffer: Buffer,
  fileName: string
): Promise<{ storagePath: string; signedUrl: string }> {
  const admin = createAdminClient()
  const safeFileName = sanitizeExportFileName(fileName)
  const storagePath = `${Date.now()}_${crypto.randomUUID()}_${safeFileName}`

  const { error: uploadError } = await admin.storage
    .from(GDPR_EXPORT_BUCKET)
    .upload(storagePath, zipBuffer, {
      contentType: 'application/zip',
      cacheControl: '60',
      upsert: false,
    })

  if (uploadError) {
    throw new Error(`Failed to upload GDPR export archive: ${uploadError.message}`)
  }

  const { data: signedUrlData, error: signedUrlError } = await admin.storage
    .from(GDPR_EXPORT_BUCKET)
    .createSignedUrl(storagePath, GDPR_EXPORT_SIGNED_URL_TTL_SECONDS)

  if (signedUrlError || !signedUrlData?.signedUrl) {
    throw new Error(
      `Failed to create signed URL for GDPR export archive: ${signedUrlError?.message ?? 'Unknown error'}`
    )
  }

  return {
    storagePath,
    signedUrl: signedUrlData.signedUrl,
  }
}

export async function cleanupExpiredGdprExportArchives(
  retentionHours: number = GDPR_EXPORT_RETENTION_HOURS
): Promise<{ deletedCount: number }> {
  const admin = createAdminClient()
  const cutoffTimestamp = Date.now() - retentionHours * 60 * 60 * 1000
  const staleObjectNames: string[] = []
  let offset = 0

  while (true) {
    const { data: objects, error } = await admin.storage.from(GDPR_EXPORT_BUCKET).list('', {
      limit: 100,
      offset,
      sortBy: { column: 'name', order: 'asc' },
    })

    if (error) {
      throw new Error(`Failed to list GDPR export archives: ${error.message}`)
    }

    if (!objects || objects.length === 0) {
      break
    }

    for (const object of objects) {
      const match = object.name.match(/^(\d{13})_/)
      if (!match) {
        continue
      }

      const createdTimestamp = Number(match[1])
      if (Number.isFinite(createdTimestamp) && createdTimestamp < cutoffTimestamp) {
        staleObjectNames.push(object.name)
      }
    }

    if (objects.length < 100) {
      break
    }

    offset += objects.length
  }

  if (staleObjectNames.length === 0) {
    return { deletedCount: 0 }
  }

  const { error: removeError } = await admin.storage
    .from(GDPR_EXPORT_BUCKET)
    .remove(staleObjectNames)

  if (removeError) {
    throw new Error(`Failed to remove expired GDPR export archives: ${removeError.message}`)
  }

  return { deletedCount: staleObjectNames.length }
}
