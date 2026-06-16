import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const gates = [
  {
    level: 'automated',
    name: 'Evidence log creation',
    notes: 'Generate a timestamped evidence file before the beta run starts.',
    repoHelper: 'pnpm beta:evidence -- --slug private-beta --env-url https://your-beta-url',
  },
  {
    level: 'automated',
    name: 'Deployed health endpoint probe',
    notes: 'Probe `/api/health` without exposing secrets and verify the expected `status: ok` response.',
    repoHelper: 'pnpm beta:health -- --base-url https://your-beta-url',
  },
  {
    level: 'automated',
    name: 'Repo helper and evidence directory sanity',
    notes: 'Confirm the beta automation docs, helper scripts, and evidence directory exist in the repo.',
    repoHelper: 'pnpm beta:manual-gates',
  },
  {
    level: 'partially automated',
    name: 'Beta monitoring cron',
    notes: 'The deployed cron checks zero-signup and Stripe webhook failure/stale-processing signals, but alert delivery still requires live env and inbox evidence.',
    repoHelper: 'GET /api/cron/beta-monitoring with CRON_SECRET',
  },
  {
    level: 'partially automated',
    name: 'Runtime env var name coverage',
    notes: 'Check that required env var names are present in the current shell without printing values.',
    repoHelper: 'pnpm beta:manual-gates',
  },
  {
    level: 'partially automated',
    name: 'Stripe webhook verification',
    notes: 'The repo already has a webhook check script, but it still depends on live Stripe config.',
    repoHelper: 'pnpm billing:webhook:check',
  },
  {
    level: 'partially automated',
    name: 'Transactional email smoke send',
    notes: 'You can trigger a test email from the repo, but inbox delivery and provider placement still require a human recipient.',
    repoHelper: 'pnpm email:test you@example.com',
  },
  {
    level: 'partially automated',
    name: 'Auth email configuration sync',
    notes: 'Supabase auth email settings can be synchronized from repo configuration, but live provider behavior remains manual.',
    repoHelper: 'pnpm email:auth:sync',
  },
  {
    level: 'partially automated',
    name: 'Email DNS authentication check',
    notes: 'DNS TXT records can be checked from the repo after SPF, DMARC, and provider DKIM records are configured.',
    repoHelper: 'pnpm email:dns:check -- --domain complyeur.com --dkim-selector <selector>',
  },
  {
    level: 'partially automated',
    name: 'Recovery evidence prep',
    notes: 'The recovery runbook is documented, but the restore tabletop and validation run still require an operator.',
    repoHelper: 'docs/RUNBOOK.md',
  },
  {
    level: 'partially automated',
    name: 'Non-founder journey baseline',
    notes: 'Existing Playwright baseline coverage reduces risk, but a real deployed-user pass is still required.',
    repoHelper: 'pnpm test:e2e:baseline',
  },
  {
    level: 'manual only',
    name: 'Gmail / Outlook / corporate inbox deliverability',
    notes: 'Only a human recipient can confirm inbox placement, spam behavior, and broken links.',
  },
  {
    level: 'manual only',
    name: 'Password reset reuse and session behavior',
    notes: 'The code path exists, but the token lifecycle and post-reset session handling must be observed live.',
  },
  {
    level: 'manual only',
    name: 'Real-device iPhone Safari and Android Chrome checks',
    notes: 'Local automation does not replace physical-device verification.',
  },
  {
    level: 'manual only',
    name: 'Screen reader and ad blocker checks',
    notes: 'Assistive tech and browser-extension behavior require live interaction.',
  },
  {
    level: 'manual only',
    name: 'Dark-mode email rendering',
    notes: 'Mail client rendering must be checked in an actual inbox.',
  },
  {
    level: 'manual only',
    name: 'GitHub branch protection confirmation',
    notes: 'GitHub settings cannot be proven from repo state alone.',
  },
  {
    level: 'manual only',
    name: 'Supabase backups / PITR and Sentry alert ownership',
    notes: 'Dashboard configuration and owner routing must be verified in live SaaS consoles.',
  },
  {
    level: 'manual only',
    name: 'SPF / DKIM / DMARC and legal sign-off',
    notes: 'DNS and legal review are external to the repo.',
  },
]

const requiredRepoPaths = [
  'docs/operations/BETA_VERIFICATION_AUTOMATION.md',
  'docs/operations/BETA_MANUAL_VERIFICATION_CHECKLIST.md',
  'docs/operations/BETA_SUPPORT_AND_ALERTING.md',
  'docs/operations/BETA_EVIDENCE_LOG_TEMPLATE.md',
  'docs/operations/evidence',
  'scripts/beta/manual-gate-helper.mjs',
  'scripts/beta/check-production-health.mjs',
  'scripts/beta/create-evidence-log.mjs',
  'scripts/beta/check-email-dns.mjs',
]

const envGroups = [
  {
    label: 'Core application',
    keys: [
      'NEXT_PUBLIC_APP_URL',
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY',
      'DATABASE_URL',
    ],
  },
  {
    label: 'Email and billing',
    keys: [
      'RESEND_API_KEY',
      'EMAIL_FROM',
      'EMAIL_REPLY_TO',
      'STRIPE_SECRET_KEY',
      'STRIPE_WEBHOOK_SECRET',
    ],
  },
  {
    label: 'Monitoring and rate limiting',
    keys: [
      'NEXT_PUBLIC_SENTRY_DSN',
      'SENTRY_ORG',
      'SENTRY_PROJECT',
      'UPSTASH_REDIS_REST_URL',
      'UPSTASH_REDIS_REST_TOKEN',
    ],
  },
]

function printSection(title) {
  console.log(`\n${title}`)
}

function printGateSection(level) {
  const matches = gates.filter((gate) => gate.level === level)

  printSection(level.toUpperCase())
  for (const gate of matches) {
    console.log(`- ${gate.name}`)
    console.log(`  ${gate.notes}`)
    if (gate.repoHelper) {
      console.log(`  Helper: ${gate.repoHelper}`)
    }
  }
}

function runRepoPathChecks(rootDir) {
  const missing = requiredRepoPaths.filter((relativePath) => !fs.existsSync(path.join(rootDir, relativePath)))

  printSection('REPO SANITY')
  if (missing.length === 0) {
    console.log('- All beta automation files and directories are present.')
  } else {
    console.log('- Missing required repo paths:')
    for (const item of missing) {
      console.log(`  ${item}`)
    }
  }

  return missing
}

function runEnvChecks() {
  printSection('CURRENT SHELL ENV NAME COVERAGE')
  console.log('- This checks only whether env var names are loaded in the current shell.')
  console.log('- It does not prove Vercel, Supabase, Stripe, or Sentry dashboard configuration.')

  for (const group of envGroups) {
    console.log(`\n${group.label}:`)
    for (const key of group.keys) {
      const present = Boolean(process.env[key]?.trim())
      console.log(`- ${key}: ${present ? 'present' : 'missing'}`)
    }
  }
}

function main() {
  const rootDir = process.cwd()
  console.log('ComplyEur beta manual gate helper')
  console.log(`Working directory: ${rootDir}`)

  const missing = runRepoPathChecks(rootDir)
  printGateSection('automated')
  printGateSection('partially automated')
  printGateSection('manual only')
  runEnvChecks()

  printSection('SUGGESTED NEXT COMMANDS')
  console.log('- pnpm beta:evidence -- --slug private-beta --env-url https://your-beta-url')
  console.log('- pnpm beta:manual-gates')
  console.log('- pnpm beta:health -- --base-url https://your-beta-url')
  console.log('- pnpm billing:webhook:check')
  console.log('- pnpm email:dns:check -- --domain complyeur.com --dkim-selector <selector>')

  if (missing.length > 0) {
    process.exitCode = 1
  }
}

main()
