import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('Supabase auth password policy', () => {
  it('enforces minimum length and complexity requirements in local auth config', () => {
    const configPath = join(process.cwd(), 'supabase/config.toml')
    const config = readFileSync(configPath, 'utf8')

    expect(config).toMatch(/minimum_password_length\s*=\s*8/)
    expect(config).toMatch(/password_requirements\s*=\s*"lower_upper_letters_digits"/)
  })

  it('keeps Google OAuth nonce validation enabled', () => {
    const configPath = join(process.cwd(), 'supabase/config.toml')
    const config = readFileSync(configPath, 'utf8')

    expect(config).toMatch(/\[auth\.external\.google\][\s\S]*skip_nonce_check\s*=\s*false/)
  })
})
