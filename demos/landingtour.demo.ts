import { test } from '@argo-video/cli'

// Narrated landing tour (public page, no login).
test('landingtour', async ({ page, narration }) => {
  test.setTimeout(300000)
  await page.addInitScript("try{localStorage.setItem('tp-locale','en')}catch(e){}")
  await page.goto('/')
  await page.waitForTimeout(2500)

  await narration.startRecording(page)

  // 1 — hero
  narration.mark('hero')
  await page.waitForTimeout(narration.durationFor('hero'))

  // 2 — features
  await page.evaluate(() => {
    document.querySelector('#features')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })
  narration.mark('features')
  await page.waitForTimeout(narration.durationFor('features'))

  // 3 — film
  await page.evaluate(() => {
    document.querySelector('#film')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })
  narration.mark('film')
  await page.waitForTimeout(narration.durationFor('film'))

  // 4 — live demo preview
  await page.evaluate(() => {
    document.querySelector('#demo')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })
  narration.mark('demo')
  await page.waitForTimeout(narration.durationFor('demo'))

  // 5 — how it works
  await page.evaluate(() => {
    document.querySelector('#how')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })
  narration.mark('how')
  await page.waitForTimeout(narration.durationFor('how'))

  // 6 — footer + outro
  await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }))
  narration.mark('outro')
  await page.waitForTimeout(narration.durationFor('outro'))
})
