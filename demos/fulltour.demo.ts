import { test, focusRing } from '@argo-video/cli'

// Complete product tour, English narration, no overlays.
// Read-only demo: nothing is written (no confirm, no top-up, no submit).
const EMAIL = process.env.DEMO_EMAIL || 'demo@tontinepilot.sn'
const PASSWORD = process.env.DEMO_PASSWORD || 'T0ntine-DEMO-2026!'

test('fulltour', async ({ page, narration }) => {
  test.setTimeout(600000)
  await page.addInitScript("try{localStorage.setItem('tp-locale','en')}catch(e){}")

  // Setup (not recorded): login, data on screen
  await page.goto('/login')
  await page.locator('input[type="email"]').fill(EMAIL)
  await page.locator('input[type="password"]').fill(PASSWORD)
  await page.locator('form button[type="submit"]').click()
  await page.waitForURL('**/dashboard**', { timeout: 30000 })
  await page.waitForTimeout(6000)

  await narration.startRecording(page)

  // 1 — dashboard
  narration.mark('dashboard')
  await focusRing(page, '[data-testid="dw-contributions"]')
  await page.waitForTimeout(narration.durationFor('dashboard'))

  // 2 — declare (parse only: demo writes nothing)
  await page.goto('/declare')
  narration.mark('declare')
  await page.locator('textarea').click()
  await page.keyboard.type('I paid 20000 for Awa this month', { delay: 30 })
  await page.locator('[data-testid="dw-parse"]').click()
  await page.locator('[data-testid="dw-parse-result"]').waitFor({ timeout: 60000 })
  await page.waitForTimeout(1500)

  // 3 — groups
  await page.goto('/groups')
  narration.mark('groups')
  await focusRing(page, '[data-testid="dw-groups"]')
  await page.waitForTimeout(narration.durationFor('groups'))

  // 4 — group creation wizard (show, don't submit)
  await page.goto('/group/new')
  narration.mark('groupnew')
  await page.locator('input').first.fill('Tontine Amitié')
  await page.waitForTimeout(narration.durationFor('groupnew'))

  // 5 — members + trust
  await page.goto('/members')
  narration.mark('members')
  await focusRing(page, '[data-testid="dw-members"]')
  await page.waitForTimeout(narration.durationFor('members'))

  // 6 — alerts + real audio digest
  await page.goto('/alerts')
  narration.mark('alerts')
  await page.locator('[data-testid="dw-digest-play"]').click()
  await page.waitForTimeout(4000)
  await focusRing(page, '[data-testid="dw-alerts"]')
  await page.waitForTimeout(1500)

  // 7 — emergency fund menu
  await page.goto('/fund')
  narration.mark('fund')
  await focusRing(page, '[data-testid="dw-fund"]')
  await page.waitForTimeout(narration.durationFor('fund'))

  // 8 — export
  await page.goto('/export')
  narration.mark('export')
  await page.locator('[data-testid="dw-export-csv"]').click()
  await page.waitForTimeout(1200)
  await focusRing(page, '[data-testid="dw-export"]')
  await page.waitForTimeout(1500)

  // 9 — assistant answers a live question
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
  await page.waitForTimeout(2500)

  // 10 — outro
  narration.mark('outro')
  await page.waitForTimeout(narration.durationFor('outro'))
})
