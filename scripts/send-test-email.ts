import { Resend } from 'resend'
import fs from 'node:fs'
import path from 'node:path'

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
  const v = process.env[name]
  if (!v) {
    throw new Error(`Missing required env var: ${name}`)
  }
  return v
}

async function main() {
  loadLocalEnv()

  const to = process.argv[2] || process.env.TEST_EMAIL_TO
  if (!to) {
    // Keep this script dead-simple: one required arg, or one env var.
    throw new Error('Provide recipient email as argv[2] or set TEST_EMAIL_TO')
  }

  const apiKey = requireEnv('RESEND_API_KEY')
  const from = process.env.EMAIL_FROM || 'ComplyEur <hello@complyeur.com>'
  const replyTo = process.env.EMAIL_REPLY_TO || 'support@complyeur.com'
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  const resend = new Resend(apiKey)

  const { data, error } = await resend.emails.send({
    from,
    to,
    replyTo,
    subject: 'ComplyEur Resend test email',
    text: `If you received this, Resend is configured correctly.\n\nApp URL: ${appUrl}\nSent at: ${new Date().toISOString()}\n`,
    tags: [{ name: 'category', value: 'test' }],
  })

  if (error) {
    throw new Error(`${error.name}: ${error.message}`)
  }

  // Prints only the message id, which is safe to share in logs.
  console.log(data?.id || 'sent')
}

main().catch(err => {
  console.error(err instanceof Error ? err.message : err)
  process.exitCode = 1
})
