// TEMPORARY - Delete after testing
// Visit http://localhost:3000/api/test-email to preview

import { NextResponse } from 'next/server'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://complyeur.com'

function generateWaitlistEmailHtml(companyName?: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to the ComplyEur Waitlist</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 48px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
          <!-- Header -->
          <tr>
            <td style="background-color: #e2e8f0; padding: 32px 40px; text-align: center; border-bottom: 1px solid #cbd5e1;">
              <img src="${APP_URL}/logo.svg" alt="ComplyEur" width="240" height="60" style="display: block; margin: 0 auto;" />
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 16px; color: #0f172a; font-size: 22px; font-weight: 600;">
                You're on the list${companyName ? `, ${companyName}` : ''}!
              </h2>

              <p style="margin: 0 0 24px; color: #475569; font-size: 16px; line-height: 1.6;">
                Thank you for joining the ComplyEur waitlist. You'll be among the first to know when we launch.
              </p>

              <div style="background-color: #f8fafc; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
                <p style="margin: 0 0 12px; color: #0f172a; font-size: 14px; font-weight: 600;">
                  What is ComplyEur?
                </p>
                <p style="margin: 0; color: #64748b; font-size: 14px; line-height: 1.5;">
                  ComplyEur helps UK businesses track Schengen visa compliance for employees traveling to the EU. No more spreadsheets, no more guesswork — just automated tracking of the 90/180-day rule.
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
                © ${new Date().getFullYear()} ComplyEur. All rights reserved.
              </p>
              <p style="margin: 8px 0 0; color: #94a3b8; font-size: 12px; text-align: center;">
                <a href="${APP_URL}" style="color: #64748b; text-decoration: underline;">complyeur.com</a>
              </p>
              <p style="margin: 12px 0 0; color: #94a3b8; font-size: 11px; text-align: center;">
                <a href="${APP_URL}/unsubscribe" style="color: #94a3b8; text-decoration: underline;">Unsubscribe from waitlist emails</a>
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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const companyName = searchParams.get('company') || undefined

  const html = generateWaitlistEmailHtml(companyName)

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html' },
  })
}
