import { resolveTxt } from 'node:dns/promises'
import process from 'node:process'

function parseArgs(argv) {
  const options = {
    domain: process.env.EMAIL_DOMAIN ?? 'complyeur.com',
    dkimSelectors: (process.env.EMAIL_DKIM_SELECTORS ?? '')
      .split(',')
      .map((selector) => selector.trim())
      .filter(Boolean),
    json: argv.includes('--json'),
  }

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--domain') {
      options.domain = argv[i + 1]
      i += 1
    }
    if (arg === '--dkim-selector') {
      options.dkimSelectors.push(argv[i + 1])
      i += 1
    }
  }

  return options
}

async function getTxtRecords(name) {
  try {
    const records = await resolveTxt(name)
    return records.map((parts) => parts.join(''))
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENODATA') {
      return []
    }
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOTFOUND') {
      return []
    }
    throw error
  }
}

function checkSpf(records) {
  const spf = records.find((record) => record.toLowerCase().startsWith('v=spf1'))
  if (!spf) {
    return { status: 'fail', detail: 'No SPF TXT record found.' }
  }

  const lower = spf.toLowerCase()
  const hasSendProvider = lower.includes('include:') || lower.includes('spf')
  const hasPolicy = lower.includes('-all') || lower.includes('~all')

  if (!hasSendProvider || !hasPolicy) {
    return {
      status: 'warn',
      detail: `SPF found but should be reviewed: ${spf}`,
    }
  }

  return { status: 'pass', detail: spf }
}

function checkDmarc(records) {
  const dmarc = records.find((record) => record.toLowerCase().startsWith('v=dmarc1'))
  if (!dmarc) {
    return { status: 'fail', detail: 'No DMARC TXT record found at _dmarc.' }
  }

  const lower = dmarc.toLowerCase()
  if (!lower.includes('p=')) {
    return { status: 'warn', detail: `DMARC found without p= policy: ${dmarc}` }
  }

  return { status: 'pass', detail: dmarc }
}

function checkDkim(selector, records) {
  const dkim = records.find((record) => {
    const lower = record.toLowerCase()
    return lower.includes('v=dkim1') || lower.startsWith('p=')
  })
  if (!dkim) {
    return {
      selector,
      status: 'fail',
      detail: `No DKIM TXT record found at ${selector}._domainkey.`,
    }
  }

  return { selector, status: 'pass', detail: dkim }
}

async function run() {
  const options = parseArgs(process.argv.slice(2))
  const domain = options.domain.replace(/\.$/, '')

  const domainTxt = await getTxtRecords(domain)
  const dmarcTxt = await getTxtRecords(`_dmarc.${domain}`)
  const dkimResults = []

  for (const selector of options.dkimSelectors) {
    const records = await getTxtRecords(`${selector}._domainkey.${domain}`)
    dkimResults.push(checkDkim(selector, records))
  }

  const result = {
    domain,
    spf: checkSpf(domainTxt),
    dmarc: checkDmarc(dmarcTxt),
    dkim:
      options.dkimSelectors.length === 0
        ? {
            status: 'warn',
            detail:
              'No DKIM selectors supplied. Pass --dkim-selector <selector> or set EMAIL_DKIM_SELECTORS.',
          }
        : dkimResults,
  }

  if (options.json) {
    console.log(JSON.stringify(result, null, 2))
  } else {
    console.log(`[email:dns:check] domain=${result.domain}`)
    console.log(`[${result.spf.status.toUpperCase()}] SPF: ${result.spf.detail}`)
    console.log(`[${result.dmarc.status.toUpperCase()}] DMARC: ${result.dmarc.detail}`)
    if (Array.isArray(result.dkim)) {
      for (const record of result.dkim) {
        console.log(`[${record.status.toUpperCase()}] DKIM ${record.selector}: ${record.detail}`)
      }
    } else {
      console.log(`[${result.dkim.status.toUpperCase()}] DKIM: ${result.dkim.detail}`)
    }
  }

  const statuses = [
    result.spf.status,
    result.dmarc.status,
    ...(Array.isArray(result.dkim) ? result.dkim.map((record) => record.status) : [result.dkim.status]),
  ]

  if (statuses.includes('fail')) {
    process.exitCode = 1
  }
}

run().catch((error) => {
  const message = error instanceof Error ? error.message : 'unknown error'
  console.error(`[email:dns:check] failed: ${message}`)
  process.exit(1)
})
