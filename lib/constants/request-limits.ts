export const DEFAULT_MAX_REQUEST_BODY_BYTES = 1 * 1024 * 1024 // 1MB
export const IMPORT_MAX_REQUEST_BODY_BYTES = 10 * 1024 * 1024 // 10MB

export function getMaxRequestBodyBytesForPath(pathname: string): number {
  // Import page/server-action flows need to support spreadsheet payloads.
  if (pathname === '/import' || pathname.startsWith('/import/')) {
    return IMPORT_MAX_REQUEST_BODY_BYTES
  }

  return DEFAULT_MAX_REQUEST_BODY_BYTES
}

export function formatMaxRequestBodyError(maxBytes: number): string {
  return `Request body too large. Maximum size is ${Math.floor(maxBytes / (1024 * 1024))}MB.`
}
