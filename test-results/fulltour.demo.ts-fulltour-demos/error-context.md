# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ../../demos/fulltour.demo.ts >> fulltour
- Location: demos/fulltour.demo.ts:8:5

# Error details

```
TimeoutError: locator.waitFor: Timeout 60000ms exceeded.
Call log:
  - waiting for locator('[data-testid="dw-parse-result"]') to be visible

```

# Page snapshot

```yaml
- generic [active] [ref=f1e1]:
  - generic [ref=f1e6] [cursor=pointer]:
    - button "Open Next.js Dev Tools" [ref=f1e7]
    - generic [ref=f1e11]:
      - button "Open issues overlay" [ref=f1e12]:
        - generic [ref=f1e13]:
          - generic [aria-hidden] [ref=f1e14]: "0"
          - generic [ref=f1e15]: "1"
        - generic [ref=f1e16]: Issue
      - button "Collapse issues badge" [ref=f1e17]
  - alert [ref=f1e20]
  - generic [ref=f1e21]:
    - complementary [ref=f1e22]:
      - link "TontinePilot TontinePilot" [ref=f1e24] [cursor=pointer]:
        - /url: /
        - generic [ref=f1e25]:
          - img "TontinePilot" [ref=f1e26]
          - generic [ref=f1e27]: TontinePilot
      - generic [ref=f1e28]:
        - paragraph [ref=f1e29]: Tontine Quartier Liberté
        - navigation [ref=f1e30]:
          - link "Dashboard" [ref=f1e31] [cursor=pointer]:
            - /url: /dashboard
          - link "Groups" [ref=f1e38] [cursor=pointer]:
            - /url: /groups
          - link "Declare" [ref=f1e45] [cursor=pointer]:
            - /url: /declare
          - link "Members" [ref=f1e50] [cursor=pointer]:
            - /url: /members
          - link "Alerts" [ref=f1e57] [cursor=pointer]:
            - /url: /alerts
          - link "Fund" [ref=f1e64] [cursor=pointer]:
            - /url: /fund
          - link "Export" [ref=f1e68] [cursor=pointer]:
            - /url: /export
          - link "New group" [ref=f1e74] [cursor=pointer]:
            - /url: /group/new
      - generic [ref=f1e78]:
        - generic [ref=f1e79]:
          - button "en" [ref=f1e80]
          - button "fr" [ref=f1e81]
        - link "Back to site" [ref=f1e82] [cursor=pointer]:
          - /url: /
    - generic [ref=f1e85]:
      - banner [ref=f1e86]:
        - paragraph [ref=f1e87]: Signed in as Aïssatou Diallo · Admin
        - button "Profile" [ref=f1e90]:
          - generic [ref=f1e91]: AD
      - main [ref=f1e92]:
        - generic [ref=f1e93]:
          - generic [ref=f1e94]:
            - paragraph [ref=f1e95]: Bedrock NLU · Vision OCR · live
            - heading "Declare a contribution" [level=1] [ref=f1e96]
            - paragraph [ref=f1e97]: Free text or Mobile Money screenshot — AI structures the payment.
          - generic [ref=f1e98]:
            - button "Text message" [ref=f1e99]
            - button "Mobile Money receipt" [ref=f1e103]
          - generic [ref=f1e109]:
            - generic [ref=f1e110]:
              - text: Free message
              - textbox "E.g. \"I paid 20000 for Cheikh this month\"" [ref=f1e111]: I paid 20000 for Awa this month
              - generic [ref=f1e112]:
                - button "I paid 20000 for Cheikh this month" [ref=f1e113]
                - 'button "Awa''s contribution: twenty thousand paid" [ref=f1e114]'
                - button "Moussa gave his 20k to Aïssatou" [ref=f1e115]
              - button "Parse with AI" [ref=f1e116]
            - generic [ref=f1e120]:
              - heading "Unknown payer" [level=2] [ref=f1e121]
              - paragraph [ref=f1e122]: “I paid 20000 for Awa this month” — this person is not a member of Tontine Quartier Liberté. Add them to record this payment with catch-up of their dues.
              - generic [ref=f1e123]:
                - button "Add to group" [ref=f1e124]
                - button "Fix the text" [ref=f1e125]
    - button "Open assistant" [ref=f1e127]
```

# Test source

```ts
  1  | import { test, focusRing } from '@argo-video/cli'
  2  | 
  3  | // Complete product tour, English narration, no overlays.
  4  | // Read-only demo: nothing is written (no confirm, no top-up, no submit).
  5  | const EMAIL = process.env.DEMO_EMAIL || 'demo@tontinepilot.sn'
  6  | const PASSWORD = process.env.DEMO_PASSWORD || 'T0ntine-DEMO-2026!'
  7  | 
  8  | test('fulltour', async ({ page, narration }) => {
  9  |   test.setTimeout(600000)
  10 |   await page.addInitScript("try{localStorage.setItem('tp-locale','en')}catch(e){}")
  11 | 
  12 |   // Setup (not recorded): login, data on screen
  13 |   await page.goto('/login')
  14 |   await page.locator('input[type="email"]').fill(EMAIL)
  15 |   await page.locator('input[type="password"]').fill(PASSWORD)
  16 |   await page.locator('form button[type="submit"]').click()
  17 |   await page.waitForURL('**/dashboard**', { timeout: 30000 })
  18 |   await page.waitForTimeout(6000)
  19 | 
  20 |   await narration.startRecording(page)
  21 | 
  22 |   // 1 — dashboard
  23 |   narration.mark('dashboard')
  24 |   await focusRing(page, '[data-testid="dw-contributions"]')
  25 |   await page.waitForTimeout(narration.durationFor('dashboard'))
  26 | 
  27 |   // 2 — declare (parse only: demo writes nothing)
  28 |   await page.goto('/declare')
  29 |   narration.mark('declare')
  30 |   await page.locator('textarea').click()
  31 |   await page.keyboard.type('I paid 20000 for Awa this month', { delay: 30 })
  32 |   await page.locator('[data-testid="dw-parse"]').click()
> 33 |   await page.locator('[data-testid="dw-parse-result"]').waitFor({ timeout: 60000 })
     |                                                         ^ TimeoutError: locator.waitFor: Timeout 60000ms exceeded.
  34 |   await page.waitForTimeout(1500)
  35 | 
  36 |   // 3 — groups
  37 |   await page.goto('/groups')
  38 |   narration.mark('groups')
  39 |   await focusRing(page, '[data-testid="dw-groups"]')
  40 |   await page.waitForTimeout(narration.durationFor('groups'))
  41 | 
  42 |   // 4 — group creation wizard (show, don't submit)
  43 |   await page.goto('/group/new')
  44 |   narration.mark('groupnew')
  45 |   await page.locator('input').first.fill('Tontine Amitié')
  46 |   await page.waitForTimeout(narration.durationFor('groupnew'))
  47 | 
  48 |   // 5 — members + trust
  49 |   await page.goto('/members')
  50 |   narration.mark('members')
  51 |   await focusRing(page, '[data-testid="dw-members"]')
  52 |   await page.waitForTimeout(narration.durationFor('members'))
  53 | 
  54 |   // 6 — alerts + real audio digest
  55 |   await page.goto('/alerts')
  56 |   narration.mark('alerts')
  57 |   await page.locator('[data-testid="dw-digest-play"]').click()
  58 |   await page.waitForTimeout(4000)
  59 |   await focusRing(page, '[data-testid="dw-alerts"]')
  60 |   await page.waitForTimeout(1500)
  61 | 
  62 |   // 7 — emergency fund menu
  63 |   await page.goto('/fund')
  64 |   narration.mark('fund')
  65 |   await focusRing(page, '[data-testid="dw-fund"]')
  66 |   await page.waitForTimeout(narration.durationFor('fund'))
  67 | 
  68 |   // 8 — export
  69 |   await page.goto('/export')
  70 |   narration.mark('export')
  71 |   await page.locator('[data-testid="dw-export-csv"]').click()
  72 |   await page.waitForTimeout(1200)
  73 |   await focusRing(page, '[data-testid="dw-export"]')
  74 |   await page.waitForTimeout(1500)
  75 | 
  76 |   // 9 — assistant answers a live question
  77 |   await page.goto('/dashboard')
  78 |   narration.mark('assistant')
  79 |   await page.locator('button[aria-label="Open assistant"]').click()
  80 |   await page.locator('input[placeholder*="question"]').waitFor({ timeout: 10000 })
  81 |   const before = await page.locator('[data-testid="dw-chat"] > div').count()
  82 |   await page.locator('input[placeholder*="question"]').click()
  83 |   await page.keyboard.type('Who still needs to pay this month?', { delay: 25 })
  84 |   await page.keyboard.press('Enter')
  85 |   await page.waitForFunction(
  86 |     (n) => document.querySelectorAll('[data-testid="dw-chat"] > div').length > n,
  87 |     before,
  88 |     { timeout: 45000 }
  89 |   )
  90 |   await page.waitForTimeout(2500)
  91 | 
  92 |   // 10 — outro
  93 |   narration.mark('outro')
  94 |   await page.waitForTimeout(narration.durationFor('outro'))
  95 | })
  96 | 
```