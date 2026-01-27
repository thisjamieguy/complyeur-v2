import { Resend } from 'resend'
import { logger } from '@/lib/logger.mjs'

// Initialize Resend client lazily
let resendClient: Resend | null = null

function getResendClient(): Resend | null {
  if (!process.env.RESEND_API_KEY) {
    return null
  }
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY)
  }
  return resendClient
}

// Email configuration
const FROM_EMAIL = process.env.EMAIL_FROM || 'ComplyEUR <hello@complyeur.com>'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://complyeur.com'

interface WaitlistEmailData {
  email: string
  companyName?: string
}

interface EmailResult {
  success: boolean
  messageId?: string
  error?: string
}

/**
 * Generate waitlist confirmation email HTML
 */
function generateWaitlistEmailHtml(data: WaitlistEmailData): string {
  const { companyName } = data

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to the ComplyEUR Waitlist</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 48px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
          <!-- Header -->
          <tr>
            <td style="background-color: #0f172a; padding: 32px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600; letter-spacing: -0.5px;">
                ComplyEUR
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 16px; color: #0f172a; font-size: 22px; font-weight: 600;">
                You're on the list${companyName ? `, ${companyName}` : ''}!
              </h2>

              <p style="margin: 0 0 24px; color: #475569; font-size: 16px; line-height: 1.6;">
                Thank you for joining the ComplyEUR waitlist. You'll be among the first to know when we launch.
              </p>

              <div style="background-color: #f8fafc; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
                <p style="margin: 0 0 12px; color: #0f172a; font-size: 14px; font-weight: 600;">
                  What is ComplyEUR?
                </p>
                <p style="margin: 0; color: #64748b; font-size: 14px; line-height: 1.5;">
                  ComplyEUR helps UK businesses track Schengen visa compliance for employees traveling to the EU. No more spreadsheets, no more guesswork — just automated tracking of the 90/180-day rule.
                </p>
              </div>

              <p style="margin: 0; color: #475569; font-size: 16px; line-height: 1.6;">
                We'll be in touch soon with updates on our launch. In the meantime, if you have any questions, just reply to this email.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 24px 40px; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0; color: #94a3b8; font-size: 12px; text-align: center;">
                © ${new Date().getFullYear()} ComplyEUR. All rights reserved.
              </p>
              <p style="margin: 8px 0 0; color: #94a3b8; font-size: 12px; text-align: center;">
                <a href="${APP_URL}" style="color: #64748b; text-decoration: underline;">complyeur.com</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`
}

/**
 * Generate plain text version of the email
 */
function generateWaitlistEmailText(data: WaitlistEmailData): string {
  const { companyName } = data

  return `
Welcome to the ComplyEUR Waitlist!

You're on the list${companyName ? `, ${companyName}` : ''}!

Thank you for joining the ComplyEUR waitlist. You'll be among the first to know when we launch.

What is ComplyEUR?
ComplyEUR helps UK businesses track Schengen visa compliance for employees traveling to the EU. No more spreadsheets, no more guesswork — just automated tracking of the 90/180-day rule.

We'll be in touch soon with updates on our launch. In the meantime, if you have any questions, just reply to this email.

---
© ${new Date().getFullYear()} ComplyEUR. All rights reserved.
${APP_URL}
`.trim()
}

/**
 * Send waitlist confirmation email via Resend
 */
export async function sendWaitlistEmail(data: WaitlistEmailData): Promise<EmailResult> {
  // Skip if no API key (development/testing)
  if (!process.env.RESEND_API_KEY) {
    logger.info('[Waitlist Email] Skipping send - no RESEND_API_KEY configured', {
      email: data.email,
    })
    return { success: true, messageId: 'dev-mode-skip' }
  }

  try {
    const resend = getResendClient()
    if (!resend) {
      logger.warn('[Waitlist Email] Skipping - Resend client not available')
      return { success: true, messageId: 'client-unavailable' }
    }

    const { data: result, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: data.email,
      subject: "You're on the ComplyEUR waitlist!",
      html: generateWaitlistEmailHtml(data),
      text: generateWaitlistEmailText(data),
      tags: [
        { name: 'type', value: 'waitlist' },
        { name: 'category', value: 'marketing' },
      ],
    })

    if (error) {
      logger.error('[Waitlist Email] Resend error', { error })
      return { success: false, error: error.message }
    }

    logger.info('[Waitlist Email] Sent successfully', {
      messageId: result?.id,
      email: data.email,
    })
    return { success: true, messageId: result?.id }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    logger.error('[Waitlist Email] Failed to send', { error: err })
    return { success: false, error: errorMessage }
  }
}
