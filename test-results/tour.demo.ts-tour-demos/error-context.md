# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: ../../demos/tour.demo.ts >> tour
- Location: demos/tour.demo.ts:6:5

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.waitFor: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('[data-testid="dw-declare"] dl').first() to be visible

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
          - link "Export" [ref=f1e64] [cursor=pointer]:
            - /url: /export
          - link "New group" [ref=f1e70] [cursor=pointer]:
            - /url: /group/new
      - generic [ref=f1e74]:
        - generic [ref=f1e75]:
          - button "en" [ref=f1e76]
          - button "fr" [ref=f1e77]
        - link "Back to site" [ref=f1e78] [cursor=pointer]:
          - /url: /
    - generic [ref=f1e81]:
      - banner [ref=f1e82]:
        - paragraph [ref=f1e83]: Signed in as Aïssatou Diallo · Admin
        - button "Profile" [ref=f1e86]:
          - generic [ref=f1e87]: AD
      - main [ref=f1e88]:
        - generic [ref=f1e89]:
          - generic [ref=f1e90]:
            - paragraph [ref=f1e91]: Bedrock NLU · Vision OCR · demo
            - heading "Declare a contribution" [level=1] [ref=f1e92]
            - paragraph [ref=f1e93]: Free text or Mobile Money screenshot — AI structures the payment.
          - generic [ref=f1e94]:
            - button "Text message" [ref=f1e95]
            - button "Mobile Money receipt" [ref=f1e99]
          - generic [ref=f1e105]:
            - generic [ref=f1e106]:
              - text: Free message
              - textbox "E.g. \"I paid 20000 for Cheikh this month\"" [ref=f1e107]: I paid 20000 for Awa this month
              - generic [ref=f1e108]:
                - button "I paid 20000 for Cheikh this month" [ref=f1e109]
                - 'button "Awa''s contribution: twenty thousand paid" [ref=f1e110]'
                - button "Moussa gave his 20k to Aïssatou" [ref=f1e111]
              - button "Parse with AI" [ref=f1e112]
            - generic [ref=f1e116]:
              - generic [ref=f1e117]:
                - heading "Structured result" [level=2] [ref=f1e118]
                - generic [ref=f1e119]: 85% confidence
                - generic [ref=f1e120]: TEXT_NLU
              - generic [ref=f1e121]:
                - generic [ref=f1e122]:
                  - term [ref=f1e123]: Member
                  - definition [ref=f1e124]:
                    - generic [ref=f1e125]: AS
                    - generic [ref=f1e126]: Awa Sarr
                - generic [ref=f1e127]:
                  - term [ref=f1e128]: Amount
                  - definition [ref=f1e129]: 20,000 FCFA
                - generic [ref=f1e130]:
                  - term [ref=f1e131]: Recipient
                  - definition [ref=f1e132]: Awa Sarr
                - generic [ref=f1e133]:
                  - term [ref=f1e134]: Text
                  - definition [ref=f1e135]: « I paid 20000 for Awa this month »
              - generic [ref=f1e136]:
                - button "Confirm entry" [ref=f1e137]
                - button "Cancel" [ref=f1e140]
    - button "Open assistant" [ref=f1e142]
```

# Test source

```ts
  1  | import { test, demoType, focusRing } from '@argo-video/cli'
  2  | 
  3  | const EMAIL = process.env.DEMO_EMAIL || 'demo@tontinepilot.sn'
  4  | const PASSWORD = process.env.DEMO_PASSWORD || 'T0ntine-DEMO-2026!'
  5  | 
  6  | test('tour', async ({ page, narration }) => {
  7  |   await page.addInitScript("try{localStorage.setItem('tp-locale','en')}catch(e){}")
  8  | 
  9  |   // Setup (not recorded): login
  10 |   await page.goto('/login')
  11 |   await page.locator('input[type="email"]').fill(EMAIL)
  12 |   await page.locator('input[type="password"]').fill(PASSWORD)
  13 |   await page.locator('form button[type="submit"]').click()
  14 |   await page.waitForURL('**/dashboard**', { timeout: 30000 })
  15 |   await page.waitForTimeout(1500)
  16 | 
  17 |   await narration.startRecording(page)
  18 | 
  19 |   // 1 — dashboard
  20 |   narration.mark('dashboard')
  21 |   await focusRing(page, '[data-testid="dw-contributions"]')
  22 |   await page.waitForTimeout(narration.durationFor('dashboard'))
  23 | 
  24 |   // 2 — declare (plain-English NLU, no confirm: demo writes nothing)
  25 |   await page.goto('/declare')
  26 |   narration.mark('declare')
  27 |   await demoType(page, 'textarea', 'I paid 20000 for Awa this month')
  28 |   await page.locator('[data-testid="dw-parse"]').click()
> 29 |   await page.locator('[data-testid="dw-declare"] dl').first().waitFor({ timeout: 40000 })
     |                                                               ^ Error: locator.waitFor: Test timeout of 30000ms exceeded.
  30 |   await page.waitForTimeout(1500)
  31 | 
  32 |   // 3 — groups
  33 |   await page.goto('/groups')
  34 |   narration.mark('groups')
  35 |   await focusRing(page, '[data-testid="dw-groups"]')
  36 |   await page.waitForTimeout(narration.durationFor('groups'))
  37 | 
  38 |   // 4 — members + trust
  39 |   await page.goto('/members')
  40 |   narration.mark('members')
  41 |   await focusRing(page, '[data-testid="dw-members"]')
  42 |   await page.waitForTimeout(narration.durationFor('members'))
  43 | 
  44 |   // 5 — alerts + audio digest
  45 |   await page.goto('/alerts')
  46 |   narration.mark('alerts')
  47 |   await page.locator('[data-testid="dw-digest-play"]').click()
  48 |   await page.waitForTimeout(4000)
  49 |   await focusRing(page, '[data-testid="dw-alerts"]')
  50 |   await page.waitForTimeout(1500)
  51 | 
  52 |   // 6 — export
  53 |   await page.goto('/export')
  54 |   narration.mark('export')
  55 |   await page.locator('[data-testid="dw-export-csv"]').click()
  56 |   await page.waitForTimeout(1200)
  57 |   await focusRing(page, '[data-testid="dw-export"]')
  58 |   await page.waitForTimeout(1500)
  59 | 
  60 |   // 7 — assistant answers a live question
  61 |   await page.goto('/dashboard')
  62 |   narration.mark('assistant')
  63 |   await page.locator('button[aria-label="Open assistant"]').click()
  64 |   await page.locator('input[placeholder*="question"]').waitFor({ timeout: 10000 })
  65 |   const before = await page.locator('[data-testid="dw-chat"] > div').count()
  66 |   await demoType(page, 'input[placeholder*="question"]', 'Who still needs to pay this month?')
  67 |   await page.keyboard.press('Enter')
  68 |   await page.waitForFunction(
  69 |     (n) => document.querySelectorAll('[data-testid="dw-chat"] > div').length > n,
  70 |     before,
  71 |     { timeout: 45000 }
  72 |   )
  73 |   await page.waitForTimeout(2500)
  74 | 
  75 |   // 8 — outro
  76 |   narration.mark('outro')
  77 |   await page.waitForTimeout(narration.durationFor('outro'))
  78 | })
  79 | 
```