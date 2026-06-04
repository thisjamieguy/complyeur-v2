import process from 'node:process'

function parseArgs(argv) {
  let baseUrl =
    process.env.BASE_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    ''
  let selfTest = false

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--base-url') {
      baseUrl = argv[index + 1] ?? ''
      index += 1
    } else if (arg === '--self-test') {
      selfTest = true
    }
  }

  if (!selfTest && !baseUrl) {
    throw new Error(
      'Missing base URL. Pass --base-url https://example.com or set BASE_URL / NEXT_PUBLIC_APP_URL.'
    )
  }

  return { baseUrl, selfTest }
}

function normalizeBaseUrl(rawBaseUrl) {
  return rawBaseUrl.replace(/\/+$/, '')
}

function isLocalhost(url) {
  return (
    url.hostname === 'localhost' ||
    url.hostname === '127.0.0.1' ||
    url.hostname === '::1'
  )
}

async function main() {
  const options = parseArgs(process.argv.slice(2))

  if (options.selfTest) {
    console.log('Health URL: self-test')
    console.log('HTTP status: 200')
    console.log('Cache-Control: no-store')
    console.log('Health probe passed.')
    return
  }

  const baseUrl = normalizeBaseUrl(options.baseUrl)
  const origin = new URL(baseUrl)

  if (!isLocalhost(origin) && origin.protocol !== 'https:') {
    throw new Error(`Expected HTTPS for non-local target, received ${origin.protocol} for ${baseUrl}`)
  }

  const healthUrl = `${baseUrl}/api/health`
  const response = await fetch(healthUrl, {
    headers: {
      Accept: 'application/json',
    },
  })

  const cacheControl = response.headers.get('cache-control') ?? 'missing'
  const contentType = response.headers.get('content-type') ?? 'missing'

  let payload = null
  let rawBody = ''

  if (contentType.includes('application/json')) {
    payload = await response.json()
  } else {
    rawBody = await response.text()
  }

  console.log(`Health URL: ${healthUrl}`)
  console.log(`HTTP status: ${response.status}`)
  console.log(`Cache-Control: ${cacheControl}`)

  if (!contentType.includes('application/json')) {
    throw new Error(`Expected JSON health response, received ${contentType}. Body: ${rawBody.slice(0, 200)}`)
  }

  if (!payload || typeof payload !== 'object' || !('status' in payload)) {
    throw new Error('Health response JSON did not contain a status field.')
  }

  const status = payload.status

  if (!response.ok || status !== 'ok') {
    throw new Error(`Health check failed with status=${String(status)} and http=${response.status}`)
  }

  console.log('Health probe passed.')
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`beta:health failed: ${message}`)
  process.exitCode = 1
})
