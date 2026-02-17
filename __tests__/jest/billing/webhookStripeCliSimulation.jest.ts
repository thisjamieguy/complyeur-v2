import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const runStripeCliTests = process.env.RUN_STRIPE_CLI_TESTS === 'true'

const describeStripeCli = runStripeCliTests ? describe : describe.skip

async function hasStripeCli(): Promise<boolean> {
  try {
    await execFileAsync('stripe', ['version'])
    return true
  } catch {
    return false
  }
}

describeStripeCli('Stripe CLI Webhook Simulation', () => {
  it('triggers a checkout.session.completed event', async () => {
    if (!(await hasStripeCli())) {
      throw new Error('Stripe CLI is not installed. Install it before running this suite.')
    }

    /**
     * Prerequisites:
     * 1. Start the app locally (`pnpm dev`).
     * 2. Start Stripe forwarding:
     *    stripe listen --forward-to http://127.0.0.1:3000/api/billing/webhook
     * 3. Ensure local env uses the emitted webhook secret from `stripe listen`.
     */
    const { stdout } = await execFileAsync('stripe', [
      'trigger',
      'checkout.session.completed',
    ])

    expect(stdout.toLowerCase()).toContain('trigger succeeded')
  })
})
