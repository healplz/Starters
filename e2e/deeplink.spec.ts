import { test, expect } from '@playwright/test'

test.describe('deck deep-links', () => {
  test('deselecting a category writes ?cats= to URL and survives reload', async ({ page }) => {
    await page.goto('/')
    const firstPill = page.getByTestId('category-pill').first()
    // All pills start selected
    await expect(firstPill).toHaveAttribute('aria-pressed', 'true')
    // Deselect it — URL should gain ?cats=
    await firstPill.click()
    await expect(firstPill).toHaveAttribute('aria-pressed', 'false')
    await expect(page).toHaveURL(/cats=/)
    // Reload — selection must survive from URL
    await page.reload()
    await expect(page.getByTestId('category-pill').first()).toHaveAttribute('aria-pressed', 'false')
  })

  test('malformed ?cats= falls back to all selected', async ({ page }) => {
    await page.goto('/?cats=__nope__')
    const pills = page.getByTestId('category-pill')
    const count = await pills.count()
    for (let i = 0; i < count; i++) {
      await expect(pills.nth(i)).toHaveAttribute('aria-pressed', 'true')
    }
  })
})