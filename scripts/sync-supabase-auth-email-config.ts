import fs from 'node:fs'
import path from 'node:path'

interface AuthConfigResponse {
  external_email_enabled?: boolean
  smtp_host?: string | null
  smtp_port?: number | null
}

interface EmailFromParts {
  email: string
  name: string
}

function loadLocalEnv() {
  const envFiles = ['.env.local', '.env']

  for (const fileName of envFiles) {
    const filePath = path.join(process.cwd(), fileName)
    if (!fs.existsSync(filePath)) continue

    const contents = fs.readFileSync(filePath, 'utf8')
    for (const rawLine of contents.split('\n')) {
      const line = rawLine.trim()
      if (!line || line.startsWith('#')) continue

      const equalsIndex = line.indexOf('=')
      if (equalsIndex === -1) continue

      const key = line.slice(0, equalsIndex).trim()
      let value = line.slice(equalsIndex + 1).trim()

      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1)
      }

      if (!(key in process.env)) {
        process.env[key] = value
      }
    }
  }
}

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required env var: ${name}`)
  }
  return value
}

function parseEmailFrom(value: string): EmailFromParts {
  const match = value.match(/^\s*([^<]+?)\s*<([^>]+)>\s*$/)

  if (match) {
    return {
      name: match[1].trim(),
      email: match[2].trim(),
    }
  }

  if (!value.includes('@')) {
    throw new Error(
      'EMAIL_FROM must be a valid sender address or "Display Name <email@example.com>".'
    )
  }

  return {
    name: 'ComplyEur',
    email: value.trim(),
  }
}

function getProjectRef(): string {
  const explicitProjectRef = process.env.SUPABASE_PROJECT_REF
  if (explicitProjectRef) {
    return explicitProjectRef
  }

  const supabaseUrl = requireEnv('NEXT_PUBLIC_SUPABASE_URL')
  const match = supabaseUrl.match(/^https?:\/\/([^.]+)\.supabase\.co\/?$/)

  if (!match) {
    throw new Error(
      'Could not infer SUPABASE_PROJECT_REF from NEXT_PUBLIC_SUPABASE_URL. Set SUPABASE_PROJECT_REF explicitly.'
    )
  }

  return match[1]
}

function readTemplate(name: 'confirmation' | 'recovery' | 'invite'): string {
  const templatePath = path.join(process.cwd(), 'supabase', 'templates', 'auth', `${name}.html`)
  return fs.readFileSync(templatePath, 'utf8')
}

async function getCurrentAuthConfig(projectRef: string, accessToken: string): Promise<AuthConfigResponse> {
  const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/config/auth`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch Supabase Auth config: ${response.status} ${response.statusText}`)
  }

  return (await response.json()) as AuthConfigResponse
}

async function patchAuthConfig(
  projectRef: string,
  accessToken: string,
  payload: Record<string, string | number | boolean>
) {
  const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/config/auth`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(
      `Failed to update Supabase Auth config: ${response.status} ${response.statusText}\n${errorText}`
    )
  }
}

async function main() {
  loadLocalEnv()

  const args = new Set(process.argv.slice(2))
  const shouldApply = args.has('--apply')
  const configureResendSmtp = args.has('--configure-resend-smtp')

  const accessToken = requireEnv('SUPABASE_ACCESS_TOKEN')
  const projectRef = getProjectRef()
  const sender = parseEmailFrom(process.env.EMAIL_FROM || 'ComplyEur <hello@complyeur.com>')
  const currentConfig = await getCurrentAuthConfig(projectRef, accessToken)
  const smtpConfigured = Boolean(currentConfig.smtp_host) && Boolean(currentConfig.smtp_port)
  const needsResendSmtpConfig = !currentConfig.external_email_enabled || !smtpConfigured

  const payload: Record<string, string | number | boolean> = {
    smtp_admin_email: sender.email,
    smtp_sender_name: sender.name,
    mailer_subjects_confirmation: 'Confirm your ComplyEur account',
    mailer_templates_confirmation_content: readTemplate('confirmation'),
    mailer_subjects_recovery: 'Reset your ComplyEur password',
    mailer_templates_recovery_content: readTemplate('recovery'),
    mailer_subjects_invite: "You're invited to ComplyEur",
    mailer_templates_invite_content: readTemplate('invite'),
  }

  if (needsResendSmtpConfig) {
    if (!configureResendSmtp) {
      throw new Error(
        'Supabase Auth custom SMTP is disabled or incomplete. Re-run with --configure-resend-smtp to switch Auth emails to Resend SMTP using RESEND_API_KEY.'
      )
    }

    payload.external_email_enabled = true
    payload.smtp_host = 'smtp.resend.com'
    payload.smtp_port = 465
    payload.smtp_user = 'resend'
    payload.smtp_pass = requireEnv('RESEND_API_KEY')
  }

  if (!shouldApply) {
    console.log(
      JSON.stringify(
        {
          projectRef,
          senderName: sender.name,
          senderEmail: sender.email,
          externalEmailEnabled: Boolean(currentConfig.external_email_enabled),
          smtpHost: currentConfig.smtp_host ?? null,
          smtpPort: currentConfig.smtp_port ?? null,
          smtpConfigured,
          wouldConfigureResendSmtp: needsResendSmtpConfig && configureResendSmtp,
          templates: ['confirmation', 'recovery', 'invite'],
        },
        null,
        2
      )
    )
    return
  }

  await patchAuthConfig(projectRef, accessToken, payload)
  console.log(`Supabase Auth email config updated for project ${projectRef}.`)
}

main().catch(err => {
  console.error(err instanceof Error ? err.message : err)
  process.exitCode = 1
})
