import { test, expect } from '@playwright/test'

// Playwright's `reducedMotion` test option does not reliably propagate to
// prefers-reduced-motion in this Chromium build, so we emulate the media query
// imperatively via page.emulateMedia, which does.

test.describe('reduced motion: collapse', () => {
  test('card flip transition collapses under prefers-reduced-motion: reduce', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/')
    const duration = await page.$eval(
      '[data-testid="card-flip"]',
      (el) => getComputedStyle(el as HTMLElement).transitionDuration,
    )
    // Chromium serializes 0.01ms as "1e-05s"; also accept "0s". Anything <= 0.02ms is the collapsed case.
    const ms = duration.endsWith('ms') ? parseFloat(duration) : parseFloat(duration) * 1000
    expect(ms).toBeLessThanOrEqual(0.1)
  })
})

test.describe('reduced motion: default', () => {
  test('card flip transition uses default duration otherwise', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await page.goto('/')
    const duration = await page.$eval(
      '[data-testid="card-flip"]',
      (el) => getComputedStyle(el as HTMLElement).transitionDuration,
    )
    expect(duration).toBe('0.3s')
  })
})