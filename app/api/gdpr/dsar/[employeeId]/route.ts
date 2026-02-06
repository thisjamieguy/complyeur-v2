import { NextRequest, NextResponse } from 'next/server'
import { generateDsarExport } from '@/lib/gdpr'

/**
 * DSAR Export Download Endpoint
 *
 * Generates and returns a ZIP file containing all personal data
 * for the specified employee (GDPR Article 15 - Right of Access).
 *
 * Security:
 * - Requires authenticated session
 * - Only owners/admins can access
 * - RLS ensures company isolation
 *
 * Usage:
 * GET /api/gdpr/dsar/[employeeId]
 *
 * Response:
 * - 200: ZIP file download
 * - 401: Unauthorized
 * - 403: Not owner/admin
 * - 404: Employee not found
 * - 500: Export error
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ employeeId: string }> }
) {
  const { employeeId } = await params

  if (!employeeId) {
    return NextResponse.json(
      { error: 'Employee ID is required' },
      { status: 400 }
    )
  }

  try {
    const result = await generateDsarExport(employeeId)

    if (!result.success) {
      const statusCode =
        result.code === 'NOT_FOUND' ? 404 :
        result.code === 'UNAUTHORIZED' ? 401 : 500

      return NextResponse.json(
        { error: result.error },
        { status: statusCode }
      )
    }

    // Return the ZIP file - convert Buffer to Uint8Array for NextResponse
    const uint8Array = new Uint8Array(result.zipBuffer)
    return new NextResponse(uint8Array, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${result.fileName}"`,
        'Content-Length': result.zipBuffer.length.toString(),
        // Prevent caching of sensitive data
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'Pragma': 'no-cache',
      },
    })
  } catch (error) {
    console.error('[DSAR API] Error:', error)

    return NextResponse.json(
      { error: 'Failed to generate export' },
      { status: 500 }
    )
  }
}
