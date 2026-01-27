import fs from 'node:fs'
import path from 'node:path'

function parseEnvFile(contents: string): Record<string, string> {
  const result: Record<string, string> = {}
  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIndex = trimmed.indexOf('=')
    if (eqIndex === -1) continue
    const key = trimmed.slice(0, eqIndex).trim()
    let value = trimmed.slice(eqIndex + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    result[key] = value
  }
  return result
}

export function loadLocalEnv(): void {
  const root = process.cwd()
  const envFiles = ['.env.local', '.env']

  for (const filename of envFiles) {
    const filePath = path.join(root, filename)
    if (!fs.existsSync(filePath)) continue
    const contents = fs.readFileSync(filePath, 'utf8')
    const parsed = parseEnvFile(contents)
    for (const [key, value] of Object.entries(parsed)) {
      if (process.env[key] === undefined) {
        process.env[key] = value
      }
    }
  }
}
