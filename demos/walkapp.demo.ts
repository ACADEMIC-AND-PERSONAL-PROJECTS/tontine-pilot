import { test, focusRing } from '@argo-video/cli'

// Silent walkthrough (no voiceover): record step only, rendered to GIF.
// Login, then every app menu: dashboard, groups, group/new, declare,
// members, alerts, export, assistant.
const EMAIL = process.env.DEMO_EMAIL || 'demo@tontinepilot.sn'
const PASSWORD = process.env.DEMO_PASSWORD || 'T0ntine-DEMO-2026!'

test('walkapp', async ({ page, narration }) => {
  test.setTimeout(300000)
  await page.addInitScript("try{localStorage.setItem('tp-locale','en')}catch(e){}")

  // Login (recorded: shows the auth flow)
  await page.goto('/login')
  await page.waitForTimeout(1200)
  await narration.startRecording(page)
  narration.mark('login')
  await page.locator('input[type="email"]').fill(EMAIL)
  await page.locator('input[type="password"]').fill(PASSWORD)
  await page.waitForTimeout(600)
  await page.locator('form button[type="submit"]').click()
  await page.waitForURL('**/dashboard**', { timeout: 30000 })
  await page.waitForTimeout(6000)

  // Dashboard
  narration.mark('dashboard')
  await focusRing(page, '[data-testid="dw-contributions"]')
  await page.waitForTimeout(3500)

  // Groups
  await page.goto('/groups')
  narration.mark('groups')
  await focusRing(page, '[data-testid="dw-groups"]')
  await page.waitForTimeout(3000)

  // Group creation wizard
  await page.goto('/group/new')
  narration.mark('group-new')
  await page.waitForTimeout(3500)

  // Declare (type + parse, no confirm: demo writes nothing)
  await page.goto('/declare')
  narration.mark('declare')
  await page.locator('textarea').click()
  await page.keyboard.type('I paid 20000 for Awa this month', { delay: 30 })
  await page.locator('[data-testid="dw-parse"]').click()
  await page.locator('[data-testid="dw-parse-result"]').waitFor({ timeout: 60000 })
  await page.waitForTimeout(2500)

  // Members + trust
  await page.goto('/members')
  narration.mark('members')
  await focusRing(page, '[data-testid="dw-members"]')
  await page.waitForTimeout(3000)

  // Alerts
  await page.goto('/alerts')
  narration.mark('alerts')
  await focusRing(page, '[data-testid="dw-alerts"]')
  await page.waitForTimeout(3000)

  // Export
  await page.goto('/export')
  narration.mark('export')
  await page.locator('[data-testid="dw-export-csv"]').click()
  await page.waitForTimeout(1200)
  await focusRing(page, '[data-testid="dw-export"]')
  await page.waitForTimeout(2500)

  // Assistant answers live
  await page.goto('/dashboard')
  narration.mark('assistant')
  await page.locator('button[aria-label="Open assistant"]').click()
  await page.locator('input[placeholder*="question"]').waitFor({ timeout: 10000 })
  const before = await page.locator('[data-testid="dw-chat"] > div').count()
  await page.locator('input[placeholder*="question"]').click()
  await page.keyboard.type('Who still needs to pay this month?', { delay: 25 })
  await page.keyboard.press('Enter')
  await page.waitForFunction(
    (n) => document.querySelectorAll('[data-testid="dw-chat"] > div').length > n,
    before,
    { timeout: 45000 }
  )
  await page.waitForTimeout(3500)
})
