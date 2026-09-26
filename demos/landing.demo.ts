import { test } from '@argo-video/cli'

// Silent walkthrough (no voiceover): record step only, rendered to GIF.
// Covers the public landing page section by section.
test('landing', async ({ page, narration }) => {
  test.setTimeout(180000)
  await page.addInitScript("try{localStorage.setItem('tp-locale','en')}catch(e){}")
  await page.goto('/')
  await page.waitForTimeout(2500)

  await narration.startRecording(page)
  narration.mark('landing')

  for (const anchor of ['#features', '#film', '#demo', '#how']) {
    await page.evaluate((sel) => {
      document.querySelector(sel)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, anchor)
    await page.waitForTimeout(4500)
  }
  // footer
  await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }))
  await page.waitForTimeout(4000)
  // back to top
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }))
  await page.waitForTimeout(3000)
})
