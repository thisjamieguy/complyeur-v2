import fs from 'node:fs'
import path from 'node:path'
import { sendWelcomeEmail } from '../lib/services/email-service'

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

async function main() {
  loadLocalEnv()

  const recipientEmail = process.argv[2] || process.env.TEST_EMAIL_TO
  if (!recipientEmail) {
    throw new Error('Provide recipient email as argv[2] or set TEST_EMAIL_TO')
  }

  const result = await sendWelcomeEmail({
    recipientEmail,
    recipientName: process.argv[3] || 'Test User',
    companyName: process.argv[4] || 'ComplyEur Test Workspace',
  })

  if (!result.success) {
    throw new Error(result.error || 'Failed to send welcome email')
  }

  console.log(result.messageId || 'sent')
}

main().catch(err => {
  console.error(err instanceof Error ? err.message : err)
  process.exitCode = 1
})
