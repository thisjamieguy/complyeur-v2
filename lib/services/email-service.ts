import { Resend } from 'resend'
import type { AlertType } from '@/types/database-helpers'

// Initialize Resend client lazily to avoid build errors when API key is not set
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
const FROM_EMAIL = process.env.EMAIL_FROM || 'ComplyEUR Alerts <alerts@complyeur.com>'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://complyeur.com'

interface AlertEmailData {
  employeeName: string
  daysUsed: number
  daysRemaining: number
  alertType: AlertType
  recipientEmail: string
  unsubscribeToken: string
  companyName?: string
}

interface EmailResult {
  success: boolean
  messageId?: string
  error?: string
}

/**
 * Generate alert email subject based on type
 */
function getAlertSubject(alertType: AlertType, employeeName: string): string {
  switch (alertType) {
    case 'warning':
      return `[Warning] ${employeeName} is approaching the Schengen 90-day limit`
    case 'urgent':
      return `[Urgent] ${employeeName} is near the Schengen 90-day limit`
    case 'breach':
      return `[BREACH] ${employeeName} has exceeded the Schengen 90-day limit`
    default:
      return `Schengen Compliance Alert for ${employeeName}`
  }
}

/**
 * Generate the email HTML content
 */
function generateAlertEmailHtml(data: AlertEmailData): string {
  const { employeeName, daysUsed, daysRemaining, alertType, unsubscribeToken } = data
  const dashboardUrl = `${APP_URL}/dashboard`
  const unsubscribeUrl = `${APP_URL}/unsubscribe?token=${unsubscribeToken}`

  // Color scheme based on alert type
  const colors = {
    warning: { bg: '#FEF3C7', border: '#F59E0B', text: '#92400E', icon: '!' },
    urgent: { bg: '#FED7AA', border: '#EA580C', text: '#9A3412', icon: '!!' },
    breach: { bg: '#FEE2E2', border: '#DC2626', text: '#991B1B', icon: '!!!' },
  }

  const color = colors[alertType]
  const nextAvailableDate = calculateNextAvailableDate(daysUsed)

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${getAlertSubject(alertType, employeeName)}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background-color: ${color.border}; padding: 24px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">
                ${alertType === 'breach' ? 'Schengen Limit EXCEEDED' : 'Schengen Compliance Alert'}
              </h1>
            </td>
          </tr>

          <!-- Alert Badge -->
          <tr>
            <td style="padding: 32px 32px 16px;">
              <div style="background-color: ${color.bg}; border-left: 4px solid ${color.border}; padding: 16px; border-radius: 4px;">
                <p style="margin: 0; color: ${color.text}; font-weight: 600; font-size: 16px;">
                  ${color.icon} ${alertType.toUpperCase()} ALERT
                </p>
              </div>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 16px 32px;">
              <p style="margin: 0 0 16px; color: #374151; font-size: 16px; line-height: 1.6;">
                ${getAlertMessage(alertType, employeeName, daysUsed)}
              </p>
            </td>
          </tr>

          <!-- Stats -->
          <tr>
            <td style="padding: 0 32px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border-radius: 8px;">
                <tr>
                  <td style="padding: 20px; text-align: center; width: 50%; border-right: 1px solid #e5e7eb;">
                    <p style="margin: 0; color: #6b7280; font-size: 14px;">Days Used</p>
                    <p style="margin: 8px 0 0; color: ${color.text}; font-size: 32px; font-weight: 700;">${daysUsed}</p>
                    <p style="margin: 4px 0 0; color: #9ca3af; font-size: 12px;">of 90 days</p>
                  </td>
                  <td style="padding: 20px; text-align: center; width: 50%;">
                    <p style="margin: 0; color: #6b7280; font-size: 14px;">Days Remaining</p>
                    <p style="margin: 8px 0 0; color: ${daysRemaining <= 0 ? '#DC2626' : '#059669'}; font-size: 32px; font-weight: 700;">${Math.max(0, daysRemaining)}</p>
                    <p style="margin: 4px 0 0; color: #9ca3af; font-size: 12px;">in 180-day window</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          ${alertType === 'breach' ? `
          <!-- Breach Warning -->
          <tr>
            <td style="padding: 0 32px 24px;">
              <div style="background-color: #FEE2E2; border: 1px solid #FECACA; padding: 16px; border-radius: 8px;">
                <p style="margin: 0; color: #991B1B; font-size: 14px; font-weight: 600;">
                  Immediate Action Required
                </p>
                <p style="margin: 8px 0 0; color: #7F1D1D; font-size: 14px;">
                  This employee has exceeded the legal Schengen stay limit. Further travel to the Schengen area must be avoided until compliance is restored. Please review the situation immediately.
                </p>
              </div>
            </td>
          </tr>
          ` : ''}

          <!-- Next Available Date -->
          ${daysUsed >= 90 && nextAvailableDate ? `
          <tr>
            <td style="padding: 0 32px 24px;">
              <div style="background-color: #F3F4F6; padding: 16px; border-radius: 8px; text-align: center;">
                <p style="margin: 0; color: #6B7280; font-size: 14px;">Next Available Travel Date (Estimated)</p>
                <p style="margin: 8px 0 0; color: #111827; font-size: 18px; font-weight: 600;">${nextAvailableDate}</p>
              </div>
            </td>
          </tr>
          ` : ''}

          <!-- CTA Button -->
          <tr>
            <td style="padding: 0 32px 32px; text-align: center;">
              <a href="${dashboardUrl}" style="display: inline-block; background-color: #2563EB; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px;">
                View Dashboard
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 24px 32px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 8px; color: #6b7280; font-size: 12px; text-align: center;">
                This is an automated compliance alert from ComplyEUR.
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px; text-align: center;">
                <a href="${unsubscribeUrl}" style="color: #9ca3af; text-decoration: underline;">Unsubscribe</a> from these notifications
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
function generateAlertEmailText(data: AlertEmailData): string {
  const { employeeName, daysUsed, daysRemaining, alertType, unsubscribeToken } = data
  const dashboardUrl = `${APP_URL}/dashboard`
  const unsubscribeUrl = `${APP_URL}/unsubscribe?token=${unsubscribeToken}`

  let text = `
SCHENGEN COMPLIANCE ALERT - ${alertType.toUpperCase()}
====================================================

${getAlertMessage(alertType, employeeName, daysUsed)}

Employee: ${employeeName}
Days Used: ${daysUsed} of 90
Days Remaining: ${Math.max(0, daysRemaining)}

`

  if (alertType === 'breach') {
    text += `
IMMEDIATE ACTION REQUIRED
This employee has exceeded the legal Schengen stay limit.
Further travel to the Schengen area must be avoided until compliance is restored.

`
  }

  text += `
View Dashboard: ${dashboardUrl}

---
This is an automated compliance alert from ComplyEUR.
Unsubscribe: ${unsubscribeUrl}
`

  return text.trim()
}

/**
 * Get the alert message based on type
 */
function getAlertMessage(alertType: AlertType, employeeName: string, daysUsed: number): string {
  switch (alertType) {
    case 'warning':
      return `${employeeName} has used ${daysUsed} days of the 90-day Schengen limit in the past 180 days. This is a warning that the employee is approaching the legal stay limit. Please monitor upcoming travel plans.`
    case 'urgent':
      return `${employeeName} has used ${daysUsed} days of the 90-day Schengen limit and is very close to exceeding the allowed stay. Any additional Schengen travel should be carefully reviewed or postponed.`
    case 'breach':
      return `${employeeName} has used ${daysUsed} days, exceeding the 90-day Schengen limit. This employee is currently in violation of Schengen area regulations. Immediate review is required.`
    default:
      return `${employeeName} has triggered a compliance alert with ${daysUsed} days used.`
  }
}

/**
 * Calculate the next available travel date based on days used
 * (Simple estimate - actual calculation should use the compliance engine)
 */
function calculateNextAvailableDate(daysUsed: number): string | null {
  if (daysUsed < 90) return null

  // Rough estimate: need to wait until enough days "expire" from the 180-day window
  const daysToWait = daysUsed - 89 // Wait until we're at 89 days used
  const nextDate = new Date()
  nextDate.setDate(nextDate.getDate() + daysToWait)

  return nextDate.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

/**
 * Send an alert email via Resend
 */
export async function sendAlertEmail(data: AlertEmailData): Promise<EmailResult> {
  // Skip if no API key (development/testing)
  if (!process.env.RESEND_API_KEY) {
    console.log('[Email] Skipping email send - no RESEND_API_KEY configured')
    console.log('[Email] Would send to:', data.recipientEmail)
    console.log('[Email] Subject:', getAlertSubject(data.alertType, data.employeeName))
    return { success: true, messageId: 'dev-mode-skip' }
  }

  try {
    const resend = getResendClient()
    if (!resend) {
      console.log('[Email] Skipping - Resend client not available')
      return { success: true, messageId: 'client-unavailable' }
    }

    const { data: result, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: data.recipientEmail,
      subject: getAlertSubject(data.alertType, data.employeeName),
      html: generateAlertEmailHtml(data),
      text: generateAlertEmailText(data),
      tags: [
        { name: 'alert_type', value: data.alertType },
        { name: 'category', value: 'compliance-alert' },
      ],
    })

    if (error) {
      console.error('[Email] Resend error:', error)
      return { success: false, error: error.message }
    }

    console.log('[Email] Sent successfully:', result?.id)
    return { success: true, messageId: result?.id }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    console.error('[Email] Failed to send:', errorMessage)
    return { success: false, error: errorMessage }
  }
}

/**
 * Send a batch of alert emails (fire-and-forget, non-blocking)
 */
export async function sendAlertEmailsAsync(
  emails: AlertEmailData[]
): Promise<void> {
  // Fire and forget - don't await
  Promise.all(
    emails.map(email =>
      sendAlertEmail(email).catch(err => {
        console.error('[Email] Failed to send to', email.recipientEmail, err)
      })
    )
  ).catch(err => {
    console.error('[Email] Batch send failed:', err)
  })
}

/**
 * Validate email configuration
 */
export function isEmailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY
}
