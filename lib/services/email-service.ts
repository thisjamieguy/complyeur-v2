import { Resend } from 'resend'
import type { AlertType } from '@/types/database-helpers'
import { logger } from '@/lib/logger.mjs'

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
const FROM_EMAIL = process.env.EMAIL_FROM || 'ComplyEur <alerts@complyeur.com>'
const REPLY_TO_EMAIL = process.env.EMAIL_REPLY_TO || 'support@complyeur.com'

function getEmailAppUrl(): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  if (appUrl) {
    return appUrl.replace(/\/+$/, '')
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`.replace(/\/+$/, '')
  }

  return 'http://localhost:3000'
}

const APP_URL = getEmailAppUrl()

function getEmailAssetBaseUrl(): string {
  if (process.env.EMAIL_ASSET_BASE_URL) {
    return process.env.EMAIL_ASSET_BASE_URL.replace(/\/+$/, '')
  }

  if (APP_URL.includes('localhost') || APP_URL.includes('127.0.0.1')) {
    return 'https://complyeur.com'
  }

  return APP_URL
}

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
function getAlertSubject(alertType: AlertType, employeeName: string, daysRemaining?: number): string {
  switch (alertType) {
    case 'warning':
      return `[Action needed] ${employeeName} is approaching the Schengen limit`
    case 'urgent':
      return daysRemaining !== undefined
        ? `[Urgent] ${employeeName} has ${daysRemaining} Schengen days left`
        : `[Urgent] ${employeeName} is near the Schengen limit`
    case 'breach':
      return `[Breach] ${employeeName} has exceeded the Schengen 90-day limit`
    default:
      return `Schengen Compliance Alert for ${employeeName}`
  }
}

function getAlertPreviewText(alertType: AlertType, daysUsed: number): string {
  switch (alertType) {
    case 'warning':
      return `They've used ${daysUsed} of 90 days — here's what to watch for.`
    case 'urgent':
      return `Any further EU travel risks a breach — review now.`
    case 'breach':
      return `${daysUsed} days used. Further EU travel must stop immediately.`
    default:
      return `Schengen compliance alert — ${daysUsed} of 90 days used.`
  }
}

function getActionItems(alertType: AlertType): string[] {
  switch (alertType) {
    case 'warning':
      return [
        'Check any planned Schengen trips in the coming weeks',
        'If travel is unavoidable, count the days carefully before booking',
        'No action needed if travel is winding down — this is an early heads-up',
      ]
    case 'urgent':
      return [
        'Postpone or cancel any upcoming Schengen travel if possible',
        'If travel cannot be avoided, seek legal advice before the trip',
      ]
    case 'breach':
      return [
        'Notify the employee — no Schengen travel until the window resets',
        'Review any upcoming trips and reroute or cancel',
        'Consider consulting an immigration specialist if travel is business-critical',
      ]
    default:
      return []
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
  const previewText = getAlertPreviewText(alertType, daysUsed)
  const actionItems = getActionItems(alertType)

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${getAlertSubject(alertType, employeeName, daysRemaining)}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <!-- Preview text (hidden, shows in inbox preview) -->
  <div style="display:none;max-height:0;overflow:hidden;">${previewText}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background-color: ${color.border}; padding: 24px; text-align: center;">
              <p style="margin: 0 0 4px; color: rgba(255,255,255,0.8); font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em;">ComplyEur Alert</p>
              <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 600;">
                ${alertType === 'breach' ? 'Schengen Limit Exceeded' : alertType === 'urgent' ? 'Urgent: Schengen Limit Near' : 'Approaching Schengen Limit'}
              </h1>
            </td>
          </tr>

          <!-- Alert Badge -->
          <tr>
            <td style="padding: 32px 32px 16px;">
              <div style="background-color: ${color.bg}; border-left: 4px solid ${color.border}; padding: 12px 16px; border-radius: 4px;">
                <p style="margin: 0; color: ${color.text}; font-weight: 600; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em;">
                  ${alertType} alert
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

          <!-- Action Items -->
          <tr>
            <td style="padding: 0 32px 24px;">
              <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; padding: 16px 20px; border-radius: 8px;">
                <p style="margin: 0 0 10px; color: #374151; font-size: 14px; font-weight: 600;">
                  ${alertType === 'breach' ? 'Immediate steps' : alertType === 'urgent' ? 'Recommended actions' : 'What to do'}
                </p>
                <ul style="margin: 0; padding-left: 20px; color: #4b5563; font-size: 14px; line-height: 1.7;">
                  ${actionItems.map(item => `<li style="margin-bottom: 4px;">${item}</li>`).join('')}
                </ul>
              </div>
            </td>
          </tr>

          <!-- Next Available Date -->
          ${daysUsed > 90 && nextAvailableDate ? `
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
                View ${employeeName.split(' ')[0]}'s travel record
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 24px 32px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 8px; color: #6b7280; font-size: 12px; text-align: center;">
                This is an automated compliance alert from ComplyEur.
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
  const actionItems = getActionItems(alertType)
  const nextAvailableDate = calculateNextAvailableDate(daysUsed)

  const actionLabel =
    alertType === 'breach'
      ? 'IMMEDIATE STEPS'
      : alertType === 'urgent'
        ? 'RECOMMENDED ACTIONS'
        : 'WHAT TO DO'

  // Strip HTML tags from message for plaintext
  const plainMessage = getAlertMessage(alertType, employeeName, daysUsed).replace(/<[^>]+>/g, '')

  let text = `
SCHENGEN COMPLIANCE ALERT — ${alertType.toUpperCase()}
====================================================

${plainMessage}

Days Used: ${daysUsed} of 90
Days Remaining: ${Math.max(0, daysRemaining)}
`

  if (daysUsed > 90 && nextAvailableDate) {
    text += `\nEstimated next available travel date: ${nextAvailableDate}\n`
  }

  if (actionItems.length > 0) {
    text += `\n${actionLabel}\n`
    actionItems.forEach(item => {
      text += `- ${item}\n`
    })
  }

  text += `
View ${employeeName}'s travel record: ${dashboardUrl}

---
This is an automated compliance alert from ComplyEur.
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
      return `<strong>${employeeName}</strong> has used <strong>${daysUsed} of 90 Schengen days</strong> in the last 180-day window. If they have upcoming EU travel planned, now is the time to review it.`
    case 'urgent':
      return `<strong>${employeeName}</strong> has used <strong>${daysUsed} of 90 Schengen days</strong>. Any further Schengen travel — including short trips — risks breaching the limit. A breach can result in entry denial, fines, or a future travel ban.`
    case 'breach':
      return `<strong>${employeeName}</strong> has used <strong>${daysUsed} days</strong> in the Schengen Area — exceeding the legal 90-day limit. <strong>Further Schengen travel must stop immediately.</strong> Travelling while in breach risks entry refusal at the border and potential immigration consequences.`
    default:
      return `${employeeName} has triggered a compliance alert with ${daysUsed} days used.`
  }
}

/**
 * Calculate the next available travel date based on days used
 * (Simple estimate - actual calculation should use the compliance engine)
 */
function calculateNextAvailableDate(daysUsed: number): string | null {
  if (daysUsed <= 90) return null

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
    logger.info('[Email] Skipping email send - no RESEND_API_KEY configured', {
      recipientEmail: data.recipientEmail,
      alertType: data.alertType,
      employeeName: data.employeeName,
    })
    return { success: true, messageId: 'dev-mode-skip' }
  }

  try {
    const resend = getResendClient()
    if (!resend) {
      logger.warn('[Email] Skipping - Resend client not available', {
        alertType: data.alertType,
      })
      return { success: true, messageId: 'client-unavailable' }
    }

    const { data: result, error } = await resend.emails.send({
      from: FROM_EMAIL,
      replyTo: REPLY_TO_EMAIL,
      to: data.recipientEmail,
      subject: getAlertSubject(data.alertType, data.employeeName, data.daysRemaining),
      html: generateAlertEmailHtml(data),
      text: generateAlertEmailText(data),
      tags: [
        { name: 'alert_type', value: data.alertType },
        { name: 'category', value: 'compliance-alert' },
      ],
    })

    if (error) {
      logger.error('[Email] Resend error', { error })
      return { success: false, error: error.message }
    }

    logger.info('[Email] Sent successfully', { messageId: result?.id })
    return { success: true, messageId: result?.id }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    logger.error('[Email] Failed to send', { error: err })
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
        logger.error('[Email] Failed to send to recipient', {
          recipientEmail: email.recipientEmail,
          error: err,
        })
      })
    )
  ).catch(err => {
    logger.error('[Email] Batch send failed', { error: err })
  })
}

/**
 * Validate email configuration
 */
export function isEmailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY
}

// ---------------------------------------------------------------------------
// Onboarding sequence emails
// ---------------------------------------------------------------------------

export interface OnboardingEmailData {
  recipientEmail: string
  companyName?: string
}

export interface WelcomeEmailData {
  recipientEmail: string
  recipientName?: string
  companyName?: string
}

function getFirstName(name: string | undefined): string | null {
  if (!name) return null
  return name.trim().split(/\s+/)[0] || null
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function generateWelcomeEmailHtml(data: WelcomeEmailData): string {
  const appUrl = APP_URL
  const assetBaseUrl = getEmailAssetBaseUrl()
  const firstName = getFirstName(data.recipientName)
  const greeting = firstName ? `Hi ${escapeHtml(firstName)},` : 'Hi,'
  const workspaceName = escapeHtml(data.companyName?.trim() || 'your workspace')
  const logoUrl = `${assetBaseUrl}/images/Icons/01_Logo_Horizontal/ComplyEur_Logo_Horizontal_800w.png`
  const dashboardUrl = `${appUrl}/dashboard`

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to ComplyEur</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f6fb;">
  <div style="display:none;max-height:0;overflow:hidden;">Your ComplyEur workspace is ready. Add employees, log trips, and review Schengen risk before travel is approved.&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #f3f6fb; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="width: 100%; max-width: 600px;">
          <tr>
            <td style="padding: 0 0 18px;">
              <img src="${logoUrl}" width="164" alt="ComplyEur" style="display: block; width: 164px; max-width: 164px; height: auto; border: 0;">
            </td>
          </tr>
          <tr>
            <td style="background-color: #ffffff; border: 1px solid #dbe4f0; border-radius: 14px; overflow: hidden; box-shadow: 0 16px 45px rgba(13,42,74,0.10);">
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td style="background-color: #0d2a4a; padding: 30px 32px 28px;">
                    <p style="margin: 0 0 10px; color: #9fc2e8; font-size: 12px; text-transform: uppercase; letter-spacing: 0.14em; font-weight: 700;">Workspace ready</p>
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; line-height: 1.25; font-weight: 700;">Welcome to ComplyEur</h1>
                    <p style="margin: 12px 0 0; color: #dbeafe; font-size: 15px; line-height: 1.6;">
                      A clearer way to manage Schengen 90/180-day travel risk for your team.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 32px 32px 10px;">
                    <p style="margin: 0 0 16px; color: #111827; font-size: 16px; line-height: 1.6;">${greeting}</p>
                    <p style="margin: 0 0 16px; color: #374151; font-size: 16px; line-height: 1.6;">
                      Your ComplyEur workspace for <strong style="color: #111827;">${workspaceName}</strong> is ready. You now have one place to track employee EU travel, monitor the rolling 90/180-day position, and catch risk before travel is approved.
                    </p>
                    <p style="margin: 0; color: #374151; font-size: 16px; line-height: 1.6;">
                      Start with these three setup steps to get your first useful compliance view in place.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 22px 32px 8px;">
                    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px;">
                      <tr>
                        <td width="54" valign="top" style="padding: 20px 0 16px 20px;">
                          <div style="width: 32px; height: 32px; border-radius: 16px; background-color: #dbeafe; color: #0d2a4a; font-size: 14px; font-weight: 700; line-height: 32px; text-align: center;">1</div>
                        </td>
                        <td style="padding: 18px 20px 16px 10px;">
                          <p style="margin: 0 0 4px; color: #0f172a; font-size: 15px; font-weight: 700;">Add your employees</p>
                          <p style="margin: 0; color: #475569; font-size: 14px; line-height: 1.6;">Create a record for each person whose Schengen travel you need to monitor.</p>
                        </td>
                      </tr>
                      <tr>
                        <td colspan="2" style="padding: 0 20px;"><div style="height: 1px; background-color: #e2e8f0;"></div></td>
                      </tr>
                      <tr>
                        <td width="54" valign="top" style="padding: 20px 0 16px 20px;">
                          <div style="width: 32px; height: 32px; border-radius: 16px; background-color: #dbeafe; color: #0d2a4a; font-size: 14px; font-weight: 700; line-height: 32px; text-align: center;">2</div>
                        </td>
                        <td style="padding: 18px 20px 16px 10px;">
                          <p style="margin: 0 0 4px; color: #0f172a; font-size: 15px; font-weight: 700;">Log past and planned trips</p>
                          <p style="margin: 0; color: #475569; font-size: 14px; line-height: 1.6;">Add recent travel history first, then planned trips, so the allowance view is reliable.</p>
                        </td>
                      </tr>
                      <tr>
                        <td colspan="2" style="padding: 0 20px;"><div style="height: 1px; background-color: #e2e8f0;"></div></td>
                      </tr>
                      <tr>
                        <td width="54" valign="top" style="padding: 20px 0 20px 20px;">
                          <div style="width: 32px; height: 32px; border-radius: 16px; background-color: #dbeafe; color: #0d2a4a; font-size: 14px; font-weight: 700; line-height: 32px; text-align: center;">3</div>
                        </td>
                        <td style="padding: 18px 20px 20px 10px;">
                          <p style="margin: 0 0 4px; color: #0f172a; font-size: 15px; font-weight: 700;">Review warnings before approval</p>
                          <p style="margin: 0; color: #475569; font-size: 14px; line-height: 1.6;">Use the dashboard to spot warning, urgent, and breach risks before travel is booked.</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 24px 32px 34px; text-align: center;">
                    <a href="${dashboardUrl}" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 700; font-size: 16px; min-width: 210px;">
                      Open your dashboard
                    </a>
                    <p style="margin: 14px 0 0; color: #64748b; font-size: 13px; line-height: 1.5;">
                      If you still need to confirm your email address, use the confirmation link first, then return to the dashboard.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="background-color: #f8fafc; padding: 24px 32px; border-top: 1px solid #e2e8f0;">
                    <p style="margin: 0 0 8px; color: #475569; font-size: 13px; line-height: 1.5; text-align: center;">
                      Need help getting set up? Reply to this email and we will help you get your first employee record live.
                    </p>
                    <p style="margin: 0; color: #94a3b8; font-size: 12px; text-align: center;">
                      ComplyEur sends this transactional email because you created a workspace.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 18px 8px 0; text-align: center;">
              <p style="margin: 0; color: #94a3b8; font-size: 12px; line-height: 1.5;">
                ComplyEur, Schengen compliance software for UK travel teams
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function generateWelcomeEmailText(data: WelcomeEmailData): string {
  const appUrl = APP_URL
  const firstName = getFirstName(data.recipientName)
  const greeting = firstName ? `Hi ${firstName},` : 'Hi,'
  const workspaceName = data.companyName?.trim() || 'your workspace'

  return `${greeting}

Welcome to ComplyEur.

Your ComplyEur workspace for ${workspaceName} is ready. You now have one place to track employee EU travel, watch the rolling 90/180-day position, and act before a trip becomes a compliance risk.

Start with these three setup steps:

1. Add your employees
Create a record for each person whose Schengen travel you need to monitor.

2. Log past and planned trips
Add recent travel history first, then planned trips, so the allowance view is reliable.

3. Review warnings before approval
Use the dashboard to spot warning, urgent, and breach risks before travel is booked.

Open your dashboard: ${appUrl}/dashboard

If you still need to confirm your email address, use the confirmation link first, then return to the dashboard.

---
Need help getting set up? Reply to this email or contact ${REPLY_TO_EMAIL}.
ComplyEur sends this transactional email because you created a workspace.`
}

export async function sendWelcomeEmail(data: WelcomeEmailData): Promise<EmailResult> {
  if (!process.env.RESEND_API_KEY) {
    logger.info('[Email] Skipping welcome email — no RESEND_API_KEY', {
      recipientEmail: data.recipientEmail,
    })
    return { success: true, messageId: 'dev-mode-skip' }
  }

  try {
    const resend = getResendClient()
    if (!resend) return { success: true, messageId: 'client-unavailable' }

    const { data: result, error } = await resend.emails.send({
      from: FROM_EMAIL,
      replyTo: REPLY_TO_EMAIL,
      to: data.recipientEmail,
      subject: 'Welcome to ComplyEur',
      html: generateWelcomeEmailHtml(data),
      text: generateWelcomeEmailText(data),
      tags: [
        { name: 'category', value: 'onboarding' },
        { name: 'step', value: 'welcome' },
      ],
    })

    if (error) {
      logger.error('[Email] Welcome email error', { error })
      return { success: false, error: error.message }
    }

    logger.info('[Email] Welcome email sent', { messageId: result?.id })
    return { success: true, messageId: result?.id }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    logger.error('[Email] Failed to send welcome email', { error: err })
    return { success: false, error: errorMessage }
  }
}

export async function sendOnboardingDay1Email(data: OnboardingEmailData): Promise<EmailResult> {
  if (!process.env.RESEND_API_KEY) {
    logger.info('[Email] Skipping onboarding day1 email — no RESEND_API_KEY', { recipientEmail: data.recipientEmail })
    return { success: true, messageId: 'dev-mode-skip' }
  }

  const resend = getResendClient()
  if (!resend) return { success: true, messageId: 'client-unavailable' }

  const greeting = data.companyName ? `Hi ${data.companyName},` : 'Hi,'
  const appUrl = APP_URL

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Get started: Add your first employee to ComplyEur</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <div style="display:none;max-height:0;overflow:hidden;">It only takes 30 seconds to start tracking compliance.&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <tr>
            <td style="background-color: #2563EB; padding: 24px; text-align: center;">
              <p style="margin: 0 0 4px; color: rgba(255,255,255,0.8); font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em;">ComplyEur</p>
              <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 600;">Add your first employee</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px 32px 24px;">
              <p style="margin: 0 0 16px; color: #374151; font-size: 16px; line-height: 1.6;">${greeting}</p>
              <p style="margin: 0 0 16px; color: #374151; font-size: 16px; line-height: 1.6;">
                You're set up on ComplyEur — the next step is to add your first employee so you can start tracking their EU travel compliance.
              </p>
              <p style="margin: 0 0 24px; color: #374151; font-size: 16px; line-height: 1.6;">
                It only takes 30 seconds. Once you've added an employee, you can log their Schengen trips and see their 90-day compliance status instantly.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 32px 32px; text-align: center;">
              <a href="${appUrl}/dashboard" style="display: inline-block; background-color: #2563EB; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px;">
                Open dashboard
              </a>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f9fafb; padding: 24px 32px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px; text-align: center;">
                Questions? Reply to this email or contact <a href="mailto:${REPLY_TO_EMAIL}" style="color: #9ca3af;">${REPLY_TO_EMAIL}</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  const text = `${greeting}

You're set up on ComplyEur — the next step is to add your first employee so you can start tracking their EU travel compliance.

It only takes 30 seconds. Once you're in the dashboard, use Add Employee to start tracking Schengen trips and current compliance status.

Open dashboard: ${appUrl}/dashboard

---
Questions? Contact ${REPLY_TO_EMAIL}`

  try {
    const { data: result, error } = await resend.emails.send({
      from: FROM_EMAIL,
      replyTo: REPLY_TO_EMAIL,
      to: data.recipientEmail,
      subject: 'Get started: Add your first employee to ComplyEur',
      html,
      text,
      tags: [{ name: 'category', value: 'onboarding' }, { name: 'step', value: 'day1' }],
    })

    if (error) {
      logger.error('[Email] Onboarding day1 error', { error })
      return { success: false, error: error.message }
    }

    logger.info('[Email] Onboarding day1 sent', { messageId: result?.id })
    return { success: true, messageId: result?.id }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    logger.error('[Email] Failed to send onboarding day1', { error: err })
    return { success: false, error: errorMessage }
  }
}

export async function sendOnboardingDay3Email(data: OnboardingEmailData): Promise<EmailResult> {
  if (!process.env.RESEND_API_KEY) {
    logger.info('[Email] Skipping onboarding day3 email — no RESEND_API_KEY', { recipientEmail: data.recipientEmail })
    return { success: true, messageId: 'dev-mode-skip' }
  }

  const resend = getResendClient()
  if (!resend) return { success: true, messageId: 'client-unavailable' }

  const greeting = data.companyName ? `Hi ${data.companyName},` : 'Hi,'
  const appUrl = APP_URL

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Log your first trip to see your compliance status</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <div style="display:none;max-height:0;overflow:hidden;">You've added your team — now log their EU travel to see where they stand.&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <tr>
            <td style="background-color: #2563EB; padding: 24px; text-align: center;">
              <p style="margin: 0 0 4px; color: rgba(255,255,255,0.8); font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em;">ComplyEur</p>
              <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 600;">Log your first trip</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px 32px 24px;">
              <p style="margin: 0 0 16px; color: #374151; font-size: 16px; line-height: 1.6;">${greeting}</p>
              <p style="margin: 0 0 16px; color: #374151; font-size: 16px; line-height: 1.6;">
                You've added your team to ComplyEur — great start. The next step is to log their EU travel so you can see their Schengen day count and compliance status.
              </p>
              <p style="margin: 0 0 24px; color: #374151; font-size: 16px; line-height: 1.6;">
                Add any past or upcoming trips to get an accurate picture of where each employee stands against the 90-day limit.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 32px 32px; text-align: center;">
              <a href="${appUrl}/dashboard" style="display: inline-block; background-color: #2563EB; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px;">
                Log your first trip
              </a>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f9fafb; padding: 24px 32px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px; text-align: center;">
                Questions? Reply to this email or contact <a href="mailto:${REPLY_TO_EMAIL}" style="color: #9ca3af;">${REPLY_TO_EMAIL}</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  const text = `${greeting}

You've added your team to ComplyEur — great start. The next step is to log their EU travel so you can see their Schengen day count and compliance status.

Add any past or upcoming trips to get an accurate picture of where each employee stands against the 90-day limit.

Log your first trip: ${appUrl}/dashboard

---
Questions? Contact ${REPLY_TO_EMAIL}`

  try {
    const { data: result, error } = await resend.emails.send({
      from: FROM_EMAIL,
      replyTo: REPLY_TO_EMAIL,
      to: data.recipientEmail,
      subject: 'Log your first trip to see your compliance status',
      html,
      text,
      tags: [{ name: 'category', value: 'onboarding' }, { name: 'step', value: 'day3' }],
    })

    if (error) {
      logger.error('[Email] Onboarding day3 error', { error })
      return { success: false, error: error.message }
    }

    logger.info('[Email] Onboarding day3 sent', { messageId: result?.id })
    return { success: true, messageId: result?.id }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    logger.error('[Email] Failed to send onboarding day3', { error: err })
    return { success: false, error: errorMessage }
  }
}

// ---------------------------------------------------------------------------
// Trial expiring email
// ---------------------------------------------------------------------------

export interface TrialExpiringEmailData {
  recipientEmail: string
  companyName?: string
  trialEndsAt: Date
  daysRemaining: number
}

export async function sendTrialExpiringEmail(data: TrialExpiringEmailData): Promise<EmailResult> {
  if (!process.env.RESEND_API_KEY) {
    logger.info('[Email] Skipping trial expiring email — no RESEND_API_KEY', { recipientEmail: data.recipientEmail })
    return { success: true, messageId: 'dev-mode-skip' }
  }

  const resend = getResendClient()
  if (!resend) return { success: true, messageId: 'client-unavailable' }

  const { companyName, trialEndsAt, daysRemaining } = data
  const greeting = companyName ? `Hi ${companyName},` : 'Hi,'
  const expiryDate = trialEndsAt.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
  const upgradeUrl = `${APP_URL}/settings?section=general`
  const daysLabel = daysRemaining === 1 ? 'tomorrow' : `in ${daysRemaining} days`

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your ComplyEur trial ends ${daysLabel}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <div style="display:none;max-height:0;overflow:hidden;">Keep tracking compliance — upgrade before ${expiryDate}.&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <tr>
            <td style="background-color: #D97706; padding: 24px; text-align: center;">
              <p style="margin: 0 0 4px; color: rgba(255,255,255,0.8); font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em;">ComplyEur</p>
              <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 600;">Your trial ends ${daysLabel}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px 32px 24px;">
              <p style="margin: 0 0 16px; color: #374151; font-size: 16px; line-height: 1.6;">${greeting}</p>
              <p style="margin: 0 0 16px; color: #374151; font-size: 16px; line-height: 1.6;">
                Your ComplyEur trial expires on <strong>${expiryDate}</strong>. After that, you'll lose access to compliance tracking, alerts, and your employee travel history.
              </p>
              <p style="margin: 0 0 24px; color: #374151; font-size: 16px; line-height: 1.6;">
                Upgrade now to keep monitoring your team's Schengen compliance without interruption.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 32px 32px; text-align: center;">
              <a href="${upgradeUrl}" style="display: inline-block; background-color: #2563EB; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px;">
                Upgrade now
              </a>
              <p style="margin: 16px 0 0; color: #9ca3af; font-size: 13px;">Questions about pricing? Reply to this email.</p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f9fafb; padding: 24px 32px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px; text-align: center;">
                Manage your subscription at <a href="${upgradeUrl}" style="color: #9ca3af;">${APP_URL}/settings</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  const text = `${greeting}

Your ComplyEur trial expires on ${expiryDate}. After that, you'll lose access to compliance tracking, alerts, and your employee travel history.

Upgrade now to keep monitoring your team's Schengen compliance without interruption.

Upgrade now: ${upgradeUrl}

Questions about pricing? Reply to this email.`

  try {
    const { data: result, error } = await resend.emails.send({
      from: FROM_EMAIL,
      replyTo: REPLY_TO_EMAIL,
      to: data.recipientEmail,
      subject: `Your ComplyEur trial ends ${daysLabel}`,
      html,
      text,
      tags: [{ name: 'category', value: 'billing' }, { name: 'step', value: 'trial_expiring' }],
    })

    if (error) {
      logger.error('[Email] Trial expiring email error', { error })
      return { success: false, error: error.message }
    }

    logger.info('[Email] Trial expiring email sent', { messageId: result?.id })
    return { success: true, messageId: result?.id }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    logger.error('[Email] Failed to send trial expiring email', { error: err })
    return { success: false, error: errorMessage }
  }
}

// ---------------------------------------------------------------------------
// Upcoming renewal email
// ---------------------------------------------------------------------------

export interface UpcomingRenewalEmailData {
  recipientEmail: string
  companyName?: string
  planName: string
  amountDue: string
  renewsAt: Date
}

export async function sendUpcomingRenewalEmail(data: UpcomingRenewalEmailData): Promise<EmailResult> {
  if (!process.env.RESEND_API_KEY) {
    logger.info('[Email] Skipping upcoming renewal email — no RESEND_API_KEY', { recipientEmail: data.recipientEmail })
    return { success: true, messageId: 'dev-mode-skip' }
  }

  const resend = getResendClient()
  if (!resend) return { success: true, messageId: 'client-unavailable' }

  const { companyName, planName, amountDue, renewsAt } = data
  const greeting = companyName ? `Hi ${companyName},` : 'Hi,'
  const renewalDate = renewsAt.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const billingUrl = `${APP_URL}/settings?section=general`

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your ComplyEur subscription renews on ${renewalDate}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <div style="display:none;max-height:0;overflow:hidden;">${amountDue} will be collected from your payment method on ${renewalDate}.&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
          <tr>
            <td style="background-color: #2563EB; padding: 24px; text-align: center;">
              <p style="margin: 0 0 4px; color: rgba(255,255,255,0.8); font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em;">ComplyEur Billing</p>
              <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 600;">Upcoming renewal</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px 32px 24px;">
              <p style="margin: 0 0 16px; color: #374151; font-size: 16px; line-height: 1.6;">${greeting}</p>
              <p style="margin: 0 0 24px; color: #374151; font-size: 16px; line-height: 1.6;">
                Your <strong>${planName}</strong> subscription renews on <strong>${renewalDate}</strong>. ${amountDue} will be collected from your payment method on file.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 32px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border-radius: 8px;">
                <tr>
                  <td style="padding: 20px; text-align: center; width: 50%; border-right: 1px solid #e5e7eb;">
                    <p style="margin: 0; color: #6b7280; font-size: 14px;">Plan</p>
                    <p style="margin: 8px 0 0; color: #111827; font-size: 18px; font-weight: 600;">${planName}</p>
                  </td>
                  <td style="padding: 20px; text-align: center; width: 50%;">
                    <p style="margin: 0; color: #6b7280; font-size: 14px;">Amount</p>
                    <p style="margin: 8px 0 0; color: #111827; font-size: 18px; font-weight: 600;">${amountDue}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 0 32px 32px; text-align: center;">
              <a href="${billingUrl}" style="display: inline-block; background-color: #2563EB; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px;">
                Manage billing
              </a>
              <p style="margin: 16px 0 0; color: #9ca3af; font-size: 13px;">Update your payment method or change your plan before renewal.</p>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f9fafb; padding: 24px 32px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px; text-align: center;">
                Questions? Reply to this email or contact <a href="mailto:${REPLY_TO_EMAIL}" style="color: #9ca3af;">${REPLY_TO_EMAIL}</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  const text = `${greeting}

Your ${planName} subscription renews on ${renewalDate}. ${amountDue} will be collected from your payment method on file.

To update your payment method or change your plan before renewal: ${billingUrl}

Questions? Contact ${REPLY_TO_EMAIL}`

  try {
    const { data: result, error } = await resend.emails.send({
      from: FROM_EMAIL,
      replyTo: REPLY_TO_EMAIL,
      to: data.recipientEmail,
      subject: `Your ComplyEur subscription renews on ${renewalDate}`,
      html,
      text,
      tags: [{ name: 'category', value: 'billing' }, { name: 'step', value: 'upcoming_renewal' }],
    })

    if (error) {
      logger.error('[Email] Upcoming renewal email error', { error })
      return { success: false, error: error.message }
    }

    logger.info('[Email] Upcoming renewal email sent', { messageId: result?.id })
    return { success: true, messageId: result?.id }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    logger.error('[Email] Failed to send upcoming renewal email', { error: err })
    return { success: false, error: errorMessage }
  }
}

// ---------------------------------------------------------------------------
// Payment failed email
// ---------------------------------------------------------------------------

export interface PaymentFailedEmailData {
  recipientEmail: string
  companyName?: string
  amountDue: string
  attemptCount: number
}

export interface BillingIncidentEmailData {
  incidentType: 'refund' | 'dispute'
  stripeEventId: string
  stripeObjectId: string
  amount: string
  customerId?: string | null
  companyName?: string | null
}

function getPaymentFailedSubject(attemptCount: number): string {
  if (attemptCount >= 3) return `[Final notice] Your ComplyEur subscription is at risk`
  if (attemptCount === 2) return `[2nd attempt failed] Update your ComplyEur payment method`
  return `Action needed: Your ComplyEur payment didn't go through`
}

function getPaymentFailedPreviewText(attemptCount: number, amountDue: string): string {
  if (attemptCount >= 3) return `We couldn't collect ${amountDue} — your subscription may be cancelled soon.`
  if (attemptCount === 2) return `We tried again and the payment still failed. Please update your card.`
  return `We couldn't collect ${amountDue}. Update your payment method to keep tracking.`
}

function generatePaymentFailedEmailHtml(data: PaymentFailedEmailData): string {
  const { companyName, amountDue, attemptCount } = data
  const billingUrl = `${APP_URL}/settings?section=general`
  const previewText = getPaymentFailedPreviewText(attemptCount, amountDue)

  const isFinal = attemptCount >= 3
  const headerColor = isFinal ? '#DC2626' : '#D97706'
  const greeting = companyName ? `Hi ${companyName},` : 'Hi,'

  const bodyText = isFinal
    ? `We've tried to collect <strong>${amountDue}</strong> three times without success. If your payment method isn't updated soon, your subscription will be cancelled and you'll lose access to compliance tracking.`
    : attemptCount === 2
      ? `We tried to collect <strong>${amountDue}</strong> again — but the payment still failed. Please update your payment method now to avoid losing access.`
      : `We couldn't collect your payment of <strong>${amountDue}</strong>. This is usually due to an expired card or insufficient funds. Your subscription is still active, but please update your payment details as soon as possible.`

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${getPaymentFailedSubject(attemptCount)}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <!-- Preview text -->
  <div style="display:none;max-height:0;overflow:hidden;">${previewText}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>

  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">

          <!-- Header -->
          <tr>
            <td style="background-color: ${headerColor}; padding: 24px; text-align: center;">
              <p style="margin: 0 0 4px; color: rgba(255,255,255,0.8); font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em;">ComplyEur Billing</p>
              <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 600;">
                Payment ${isFinal ? 'Unsuccessful — Final Notice' : 'Failed'}
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 32px 32px 0;">
              <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">${greeting}</p>
              <p style="margin: 0 0 24px; color: #374151; font-size: 16px; line-height: 1.6;">${bodyText}</p>
            </td>
          </tr>

          <!-- Amount -->
          <tr>
            <td style="padding: 0 32px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border-radius: 8px;">
                <tr>
                  <td style="padding: 20px; text-align: center;">
                    <p style="margin: 0; color: #6b7280; font-size: 14px;">Amount due</p>
                    <p style="margin: 8px 0 0; color: #111827; font-size: 32px; font-weight: 700;">${amountDue}</p>
                    ${attemptCount > 1 ? `<p style="margin: 4px 0 0; color: #9ca3af; font-size: 12px;">Attempt ${attemptCount} of 3</p>` : ''}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="padding: 0 32px 32px; text-align: center;">
              <a href="${billingUrl}" style="display: inline-block; background-color: #2563EB; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px;">
                Update payment method
              </a>
              <p style="margin: 16px 0 0; color: #9ca3af; font-size: 13px;">
                Or go to <a href="${billingUrl}" style="color: #6b7280;">${APP_URL}/settings</a> → Billing
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 24px 32px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #6b7280; font-size: 12px; text-align: center;">
                Questions? Reply to this email or contact <a href="mailto:${REPLY_TO_EMAIL}" style="color: #6b7280;">${REPLY_TO_EMAIL}</a>
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

function generatePaymentFailedEmailText(data: PaymentFailedEmailData): string {
  const { companyName, amountDue, attemptCount } = data
  const billingUrl = `${APP_URL}/settings?section=general`
  const greeting = companyName ? `Hi ${companyName},` : 'Hi,'

  const bodyText = attemptCount >= 3
    ? `We've tried to collect ${amountDue} three times without success. If your payment method isn't updated soon, your subscription will be cancelled and you'll lose access to compliance tracking.`
    : attemptCount === 2
      ? `We tried to collect ${amountDue} again — but the payment still failed. Please update your payment method now to avoid losing access.`
      : `We couldn't collect your payment of ${amountDue}. This is usually due to an expired card or insufficient funds. Your subscription is still active, but please update your payment details as soon as possible.`

  return `
${greeting}

${bodyText}

Amount due: ${amountDue}${attemptCount > 1 ? ` (attempt ${attemptCount} of 3)` : ''}

Update your payment method: ${billingUrl}

---
Questions? Reply to this email or contact ${REPLY_TO_EMAIL}
`.trim()
}

/**
 * Send a payment failed email via Resend
 */
export async function sendPaymentFailedEmail(data: PaymentFailedEmailData): Promise<EmailResult> {
  if (!process.env.RESEND_API_KEY) {
    logger.info('[Email] Skipping payment failed email — no RESEND_API_KEY', {
      recipientEmail: data.recipientEmail,
      attemptCount: data.attemptCount,
    })
    return { success: true, messageId: 'dev-mode-skip' }
  }

  try {
    const resend = getResendClient()
    if (!resend) {
      return { success: true, messageId: 'client-unavailable' }
    }

    const { data: result, error } = await resend.emails.send({
      from: FROM_EMAIL,
      replyTo: REPLY_TO_EMAIL,
      to: data.recipientEmail,
      subject: getPaymentFailedSubject(data.attemptCount),
      html: generatePaymentFailedEmailHtml(data),
      text: generatePaymentFailedEmailText(data),
      tags: [
        { name: 'category', value: 'billing' },
        { name: 'attempt', value: String(data.attemptCount) },
      ],
    })

    if (error) {
      logger.error('[Email] Payment failed email error', { error })
      return { success: false, error: error.message }
    }

    logger.info('[Email] Payment failed email sent', { messageId: result?.id })
    return { success: true, messageId: result?.id }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    logger.error('[Email] Failed to send payment failed email', { error: err })
    return { success: false, error: errorMessage }
  }
}

export async function sendBillingIncidentEmail(data: BillingIncidentEmailData): Promise<EmailResult> {
  const recipientEmail = process.env.BILLING_ALERT_EMAIL || REPLY_TO_EMAIL

  if (!process.env.RESEND_API_KEY) {
    logger.info('[Email] Skipping billing incident email — no RESEND_API_KEY', {
      incidentType: data.incidentType,
      stripeEventId: data.stripeEventId,
    })
    return { success: true, messageId: 'dev-mode-skip' }
  }

  const incidentLabel = data.incidentType === 'dispute' ? 'Stripe dispute opened' : 'Stripe refund recorded'
  const subject = `[Billing] ${incidentLabel}`
  const companyLine = data.companyName ? `Company: ${data.companyName}` : 'Company: not matched'
  const customerLine = data.customerId ? `Stripe customer: ${data.customerId}` : 'Stripe customer: not available'
  const text = [
    incidentLabel,
    '',
    companyLine,
    customerLine,
    `Stripe object: ${data.stripeObjectId}`,
    `Stripe event: ${data.stripeEventId}`,
    `Amount: ${data.amount}`,
    '',
    `Review in Stripe Dashboard and update the support/billing tracker if customer action is required.`,
  ].join('\n')

  try {
    const resend = getResendClient()
    if (!resend) {
      return { success: true, messageId: 'client-unavailable' }
    }

    const { data: result, error } = await resend.emails.send({
      from: FROM_EMAIL,
      replyTo: REPLY_TO_EMAIL,
      to: recipientEmail,
      subject,
      text,
      tags: [
        { name: 'category', value: 'billing' },
        { name: 'step', value: data.incidentType },
      ],
    })

    if (error) {
      logger.error('[Email] Billing incident email error', { error })
      return { success: false, error: error.message }
    }

    logger.info('[Email] Billing incident email sent', {
      incidentType: data.incidentType,
      messageId: result?.id,
    })
    return { success: true, messageId: result?.id }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    logger.error('[Email] Failed to send billing incident email', { error: err })
    return { success: false, error: errorMessage }
  }
}
