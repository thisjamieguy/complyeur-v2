const REDACTIONS = Object.freeze({
  email: '***REDACTED_EMAIL***',
  name: '***REDACTED_NAME***',
  ip: '***REDACTED_IP***',
  identifier: '***REDACTED_IDENTIFIER***',
  token: '***REDACTED_TOKEN***',
  generic: '***REDACTED***',
})

const EMAIL_REGEX = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi
const IPV4_REGEX = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g
const IPV6_REGEX = /\b(?:[A-F0-9]{1,4}:){2,7}[A-F0-9]{1,4}\b/gi
const JWT_REGEX = /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g
const TOKEN_KV_REGEX = /\b(token|secret|password|api_key|apikey|authorization|access_token|refresh_token|session_token)\b\s*[:=]\s*([^\s,;]+)/gi
const IDENTIFIER_KV_REGEX = /\b(user_id|userId|session_id|sessionId|session|identity_id|identifier)\b\s*[:=]\s*([^\s,;]+)/gi
const BEARER_REGEX = /\bBearer\s+[A-Za-z0-9._-]+\b/gi
const TOKEN_PREFIX_REGEX = /\b(?:sk_(?:live|test)_[A-Za-z0-9]+|rk_[A-Za-z0-9]+|pk_[A-Za-z0-9]+|tok_[A-Za-z0-9]+|sess_[A-Za-z0-9]+|secret_[A-Za-z0-9]+)\b/gi
const UNIX_USER_PATH_REGEX = /\/Users\/[^/]+/g
const WINDOWS_USER_PATH_REGEX = /\\Users\\[^\\]+/gi

const KEY_REDACTIONS = [
  { pattern: /email/i, replacement: REDACTIONS.email },
  { pattern: /(first_name|last_name|full_name|employee_name|employeeName|name)/i, replacement: REDACTIONS.name },
  { pattern: /(ip|ip_address|ipAddress)/i, replacement: REDACTIONS.ip },
  { pattern: /(user[_-]?id|session[_-]?id|sessionId|identity_id|identifier)/i, replacement: REDACTIONS.identifier },
  { pattern: /(token|secret|password|api[_-]?key|apikey|authorization|access_token|refresh_token|session_token)/i, replacement: REDACTIONS.token },
]

const baseConsole = {
  log: console.log.bind(console),
  info: console.info ? console.info.bind(console) : console.log.bind(console),
  warn: console.warn ? console.warn.bind(console) : console.log.bind(console),
  error: console.error ? console.error.bind(console) : console.log.bind(console),
}

let consoleRedactionInstalled = false

function getKeyRedaction(key) {
  if (!key) return null
  for (const rule of KEY_REDACTIONS) {
    if (rule.pattern.test(key)) return rule.replacement
  }
  return null
}

function redactString(value, keyHint) {
  const keyRedaction = getKeyRedaction(keyHint)
  if (keyRedaction) return keyRedaction

  let redacted = String(value)
  redacted = redacted.replace(EMAIL_REGEX, REDACTIONS.email)
  redacted = redacted.replace(IPV4_REGEX, REDACTIONS.ip)
  redacted = redacted.replace(IPV6_REGEX, REDACTIONS.ip)
  redacted = redacted.replace(JWT_REGEX, REDACTIONS.token)
  redacted = redacted.replace(TOKEN_PREFIX_REGEX, REDACTIONS.token)
  redacted = redacted.replace(BEARER_REGEX, `Bearer ${REDACTIONS.token}`)
  redacted = redacted.replace(TOKEN_KV_REGEX, (match, key) => `${key}=${REDACTIONS.token}`)
  redacted = redacted.replace(IDENTIFIER_KV_REGEX, (match, key) => `${key}=${REDACTIONS.identifier}`)
  redacted = redacted.replace(UNIX_USER_PATH_REGEX, '/Users/***REDACTED***')
  redacted = redacted.replace(WINDOWS_USER_PATH_REGEX, '\\\\Users\\\\***REDACTED***')
  return redacted
}

function redactError(error, seen) {
  const redacted = {
    name: error.name,
    message: redactString(error.message || '', 'message'),
  }
  if (error.code) {
    redacted.code = redactString(String(error.code), 'code')
  }
  if (error.stack) {
    redacted.stack = redactString(error.stack, 'stack')
  }
  if (error.cause) {
    redacted.cause = redactValue(error.cause, 'cause', seen)
  }
  return redacted
}

function redactValue(value, keyHint, seen = new WeakSet()) {
  if (value === null || value === undefined) return value

  if (typeof value === 'string') {
    return redactString(value, keyHint)
  }

  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return value
  }

  if (value instanceof Error) {
    return redactError(value, seen)
  }

  if (Array.isArray(value)) {
    return value.map(item => redactValue(item, keyHint, seen))
  }

  if (typeof value === 'object') {
    if (seen.has(value)) return '[Circular]'
    seen.add(value)

    const output = {}
    for (const [key, entry] of Object.entries(value)) {
      const keyRedaction = getKeyRedaction(key)
      output[key] = keyRedaction ?? redactValue(entry, key, seen)
    }
    return output
  }

  return redactString(String(value), keyHint)
}

function emit(level, message, meta) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message: redactString(message, 'message'),
  }

  if (meta && Object.keys(meta).length > 0) {
    entry.meta = redactValue(meta)
  }

  if (level === 'error') {
    baseConsole.error(JSON.stringify(entry))
  } else if (level === 'warn') {
    baseConsole.warn(JSON.stringify(entry))
  } else {
    baseConsole.log(JSON.stringify(entry))
  }
}

export const logger = {
  info(message, meta) {
    emit('info', message, meta)
  },
  warn(message, meta) {
    emit('warn', message, meta)
  },
  error(message, meta) {
    emit('error', message, meta)
  },
  debug(message, meta) {
    emit('debug', message, meta)
  },
}

export function installConsoleRedaction() {
  if (consoleRedactionInstalled) return

  const wrap = (original) => (...args) => {
    const redactedArgs = args.map(arg => redactValue(arg))
    original(...redactedArgs)
  }

  console.log = wrap(baseConsole.log)
  console.info = wrap(baseConsole.info)
  console.warn = wrap(baseConsole.warn)
  console.error = wrap(baseConsole.error)

  consoleRedactionInstalled = true
}

export const redactionRules = Object.freeze({
  keyPatterns: KEY_REDACTIONS.map(rule => rule.pattern.toString()),
  valuePatterns: [
    EMAIL_REGEX.toString(),
    IPV4_REGEX.toString(),
    IPV6_REGEX.toString(),
    JWT_REGEX.toString(),
    TOKEN_PREFIX_REGEX.toString(),
    TOKEN_KV_REGEX.toString(),
    IDENTIFIER_KV_REGEX.toString(),
    BEARER_REGEX.toString(),
    UNIX_USER_PATH_REGEX.toString(),
    WINDOWS_USER_PATH_REGEX.toString(),
  ],
  redactionMarkers: REDACTIONS,
})
