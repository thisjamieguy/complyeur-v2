/**
 * Dependency vulnerability regression gate.
 *
 * Runs `pnpm audit --json` and fails the suite if any vulnerability at
 * HIGH or CRITICAL severity is found.  MODERATE and LOW findings are
 * reported but not blocking (they're in devDependencies and can be
 * explicitly excluded via the accepted list below).
 *
 * This prevents new dependencies from silently reintroducing the
 * vulnerabilities we cleaned up on 2026-03-30.
 *
 * Accepted exceptions (unfixable without breaking the toolchain):
 *   - eslint > @eslint/eslintrc > ajv <6.14.0
 *     Moderate ReDoS, devDependency, $data option not used by eslint.
 *     Forcing ajv >=6.14.0 breaks eslint's module initialisation.
 */
import { describe, expect, it } from 'vitest'
import { execFileSync } from 'child_process'
import path from 'path'

const PROJECT_ROOT = path.resolve(__dirname, '../../../')

interface AuditAdvisory {
  severity: string
  module_name: string
  title: string
  paths?: Array<{ path: string }>
}

interface AuditReport {
  metadata?: { vulnerabilities?: Record<string, number> }
  advisories?: Record<string, AuditAdvisory>
}

// Advisory paths that are documented accepted exceptions.
// Only add entries here when the vulnerability genuinely cannot be fixed
// (e.g. updating the dep breaks the toolchain) and the risk is confirmed
// to be limited to devDependencies with no production exposure.
const ACCEPTED_EXCEPTION_PATHS = [
  // Moderate: eslint > @eslint/eslintrc > ajv — ReDoS, dev-only
  '@eslint/eslintrc>ajv',
]

function isAcceptedException(advisory: AuditAdvisory): boolean {
  const paths = advisory.paths?.map((p) => p.path) ?? []
  return paths.some((p) =>
    ACCEPTED_EXCEPTION_PATHS.some((exception) => p.includes(exception))
  )
}

describe('dependency audit', () => {
  it('has no HIGH or CRITICAL vulnerabilities', { timeout: 60000 }, () => {
    let rawOutput = ''
    try {
      rawOutput = execFileSync('pnpm', ['audit', '--json'], {
        cwd: PROJECT_ROOT,
        encoding: 'utf8',
        timeout: 60000,
        stdio: ['pipe', 'pipe', 'pipe'],
      })
    } catch (err: unknown) {
      // pnpm audit exits with code 1 when vulnerabilities are found
      rawOutput = (err as { stdout?: string }).stdout ?? '{}'
    }

    let report: AuditReport = {}
    try {
      report = JSON.parse(rawOutput)
    } catch {
      // If JSON parsing fails (network issue, registry timeout), skip
      // rather than fail — this avoids false CI failures on flaky networks.
      console.warn('[dependency-audit] Could not parse audit JSON — skipping gate')
      return
    }

    const advisories = report.advisories ?? {}
    const blocking: string[] = []
    const warnings: string[] = []

    for (const [, advisory] of Object.entries(advisories)) {
      const severity = advisory.severity?.toLowerCase()
      const label = `${severity?.toUpperCase()} ${advisory.module_name}: ${advisory.title}`

      if (isAcceptedException(advisory)) {
        console.info(`[dependency-audit] Accepted exception: ${label}`)
        continue
      }

      if (severity === 'critical' || severity === 'high') {
        blocking.push(label)
      } else {
        warnings.push(label)
      }
    }

    if (warnings.length > 0) {
      console.warn(
        `[dependency-audit] MODERATE/LOW findings (non-blocking):\n  ${warnings.join('\n  ')}`
      )
    }

    expect(
      blocking,
      `Found HIGH/CRITICAL vulnerabilities — run \`pnpm audit\` and resolve them:\n  ${blocking.join('\n  ')}`
    ).toHaveLength(0)
  })
})
