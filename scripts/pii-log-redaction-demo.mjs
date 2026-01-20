import { logger } from '../lib/logger.mjs'

logger.info('PII redaction demo: structured log', {
  email: 'user@example.com',
  name: 'Example User',
  employeeName: 'Example User',
  ip: '203.0.113.10',
  user_id: 'user_123456789',
  session_id: 'sess_abcdef123456',
  token: 'sk_test_51ExampleSecretToken',
})

logger.warn('PII redaction demo: text patterns', {
  message: 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.fake.payload',
  note: 'user_id=usr_123 email=user@example.com ip=198.51.100.44',
})

logger.error('PII redaction demo: error logging', {
  error: new Error('Failed to process user user@example.com with token sk_live_51ExampleToken'),
})
