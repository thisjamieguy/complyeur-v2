import { afterEach, describe, expect, it } from 'vitest'
import {
  decryptWaitlistEmail,
  encryptWaitlistEmail,
  hashWaitlistEmail,
  normalizeWaitlistEmail,
} from '@/lib/security/waitlist-encryption'

const ORIGINAL_ENV = { ...process.env }
const TEST_KEY = Buffer.alloc(32, 7).toString('base64')

describe('waitlist email encryption', () => {
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV }
  })

  it('normalizes email casing and whitespace', () => {
    expect(normalizeWaitlistEmail('  Alice.Example+test@Example.COM  ')).toBe(
      'alice.example+test@example.com'
    )
  })

  it('hashes normalized email deterministically', () => {
    process.env.WAITLIST_EMAIL_HASH_PEPPER = 'pepper-value'

    const hashA = hashWaitlistEmail(' Alice@Example.com ')
    const hashB = hashWaitlistEmail('alice@example.com')

    expect(hashA).toBe(hashB)
    expect(hashA).toMatch(/^[a-f0-9]{64}$/)
  })

  it('encrypts and decrypts with AES-256-GCM', () => {
    process.env.WAITLIST_EMAIL_ENCRYPTION_KEY = TEST_KEY
    process.env.WAITLIST_EMAIL_HASH_PEPPER = 'pepper-value'
    process.env.WAITLIST_EMAIL_KEY_VERSION = 'v3'

    const encrypted = encryptWaitlistEmail('Alice@Example.com')

    expect(encrypted.algorithm).toBe('aes-256-gcm')
    expect(encrypted.keyVersion).toBe('v3')
    expect(encrypted.ciphertext).not.toBe('')
    expect(encrypted.iv).not.toBe('')
    expect(encrypted.tag).not.toBe('')

    const decrypted = decryptWaitlistEmail(encrypted)
    expect(decrypted).toBe('alice@example.com')
  })

  it('produces different ciphertext for the same plaintext', () => {
    process.env.WAITLIST_EMAIL_ENCRYPTION_KEY = TEST_KEY
    process.env.WAITLIST_EMAIL_HASH_PEPPER = 'pepper-value'

    const first = encryptWaitlistEmail('alice@example.com')
    const second = encryptWaitlistEmail('alice@example.com')

    expect(first.ciphertext).not.toBe(second.ciphertext)
    expect(first.iv).not.toBe(second.iv)
  })
})
