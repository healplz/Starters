import { test, expect } from '@playwright/test'

test.describe('share and copy', () => {
  test('share falls back to download on desktop', async ({ page }) => {
    await page.goto('/')
    const download = page.waitForEvent('download')
    await page.getByTestId('share-button').click()
    const dl = await download
    expect(dl.suggestedFilename()).toBe('starters-card.png')
  })
})

test.describe('copy to clipboard', () => {
  test.use({ permissions: ['clipboard-read', 'clipboard-write'] })

  test('copy writes image/png to clipboard', async ({ page }) => {
    await page.addInitScript(() => {
      window.__clipWrites = []
      window.__clipText = []
      const w = Clipboard.prototype.write
      Clipboard.prototype.write = function (this: Clipboard, ...args: Parameters<typeof w>) {
        try {
          window.__clipWrites!.push(args[0].map((i) => [...i.types]))
        } catch {
          /* ignore */
        }
        return w.apply(this, args)
      }
      const t = Clipboard.prototype.writeText
      Clipboard.prototype.writeText = function (this: Clipboard, ...args: Parameters<typeof t>) {
        window.__clipText!.push(args[0])
        return t.apply(this, args)
      }
    })
    await page.goto('/')
    await page.getByTestId('copy-button').click()
    const writes = await page.evaluate(() => window.__clipWrites ?? [])
    const text = await page.evaluate(() => window.__clipText ?? [])
    expect(writes.flat(2)).toContain('image/png')
    expect(text).toHaveLength(0)
  })
})