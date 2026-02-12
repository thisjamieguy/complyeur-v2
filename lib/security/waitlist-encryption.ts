import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'

const WAITLIST_EMAIL_ENCRYPTION_KEY_ENV = 'WAITLIST_EMAIL_ENCRYPTION_KEY'
const WAITLIST_EMAIL_HASH_PEPPER_ENV = 'WAITLIST_EMAIL_HASH_PEPPER'
const WAITLIST_EMAIL_KEY_VERSION_ENV = 'WAITLIST_EMAIL_KEY_VERSION'
const WAITLIST_EMAIL_ENCRYPTION_REQUIRED_ENV = 'WAITLIST_EMAIL_ENCRYPTION_REQUIRED'

const AES_256_GCM = 'aes-256-gcm'
const GCM_IV_BYTES = 12
const AES_256_KEY_BYTES = 32

export type EncryptedWaitlistEmail = {
  ciphertext: string
  iv: string
  tag: string
  keyVersion: string
  algorithm: 'aes-256-gcm'
}

export function normalizeWaitlistEmail(value: string): string {
  return value.trim().toLowerCase()
}

export function isWaitlistEmailEncryptionRequired(): boolean {
  return (
    process.env.NODE_ENV === 'production' ||
    process.env[WAITLIST_EMAIL_ENCRYPTION_REQUIRED_ENV] === 'true'
  )
}

function parseAes256Key(rawKey: string): Buffer {
  const trimmed = rawKey.trim()

  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    return Buffer.from(trimmed, 'hex')
  }

  const decoded = Buffer.from(trimmed, 'base64')
  if (decoded.length === AES_256_KEY_BYTES) {
    return decoded
  }

  throw new Error(
    `${WAITLIST_EMAIL_ENCRYPTION_KEY_ENV} must be a 32-byte key encoded as base64 (preferred) or 64-char hex`
  )
}

function getWaitlistEncryptionKey(): Buffer {
  const key = process.env[WAITLIST_EMAIL_ENCRYPTION_KEY_ENV]
  if (!key) {
    throw new Error(`Missing ${WAITLIST_EMAIL_ENCRYPTION_KEY_ENV}`)
  }

  return parseAes256Key(key)
}

function getWaitlistHashPepper(): string {
  const pepper = process.env[WAITLIST_EMAIL_HASH_PEPPER_ENV]

  if (isWaitlistEmailEncryptionRequired() && !pepper) {
    throw new Error(`Missing ${WAITLIST_EMAIL_HASH_PEPPER_ENV}`)
  }

  return pepper ?? ''
}

function getWaitlistKeyVersion(): string {
  return process.env[WAITLIST_EMAIL_KEY_VERSION_ENV] || 'v1'
}

export function hashWaitlistEmail(email: string): string {
  const normalized = normalizeWaitlistEmail(email)
  const pepper = getWaitlistHashPepper()
  return createHash('sha256').update(`${pepper}:${normalized}`).digest('hex')
}

export function encryptWaitlistEmail(email: string): EncryptedWaitlistEmail {
  const normalized = normalizeWaitlistEmail(email)
  const key = getWaitlistEncryptionKey()
  const iv = randomBytes(GCM_IV_BYTES)

  const cipher = createCipheriv(AES_256_GCM, key, iv)
  const ciphertext = Buffer.concat([cipher.update(normalized, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()

  return {
    ciphertext: ciphertext.toString('base64'),
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    keyVersion: getWaitlistKeyVersion(),
    algorithm: AES_256_GCM,
  }
}

export function decryptWaitlistEmail(payload: {
  ciphertext: string
  iv: string
  tag: string
}): string {
  const key = getWaitlistEncryptionKey()
  const decipher = createDecipheriv(
    AES_256_GCM,
    key,
    Buffer.from(payload.iv, 'base64')
  )
  decipher.setAuthTag(Buffer.from(payload.tag, 'base64'))

  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(payload.ciphertext, 'base64')),
    decipher.final(),
  ])

  return plaintext.toString('utf8')
}
