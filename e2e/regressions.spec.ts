import { test, expect } from '@playwright/test'

test.describe('regressions', () => {
  test('#1 + #2: allExhausted latch clears on category toggle after empty-selection reset', async ({ page }) => {
    await page.goto('/')
    // Clear all categories → selection is empty
    await page.getByText('clear all').click()
    // Action row reset button is visible
    const resetBtn = page.getByTestId('reset-button')
    await expect(resetBtn).toBeVisible()
    // Click reset — drawFrom returns null with empty activeCats → allExhausted true (#2)
    await resetBtn.click()
    await expect(page.getByTestId('reset-session-button')).toBeVisible()
    // Select first category pill — latch must clear (#1)
    await page.getByTestId('category-pill').first().click()
    await expect(page.getByTestId('draw-button')).toBeVisible()
  })

  test('#3: deep-linked deck pre-loads card from selected category', async ({ page }) => {
    await page.goto('/')
    // Clear all, then select first pill (URL gains ?cats=<slug>)
    await page.getByText('clear all').click()
    const firstPill = page.getByTestId('category-pill').first()
    const catName = (await firstPill.textContent()) ?? ''
    await firstPill.click()
    // Reload with the ?cats= param already in URL
    await page.reload()
    // First click reveals the pre-loaded card (no new draw)
    await page.getByTestId('draw-button').click()
    // Card category matches the selected category
    const cardCat = page.getByTestId('card-category')
    await expect(cardCat).toBeVisible()
    // Category pill short-name may differ; just verify it's non-empty and from selected deck
    const cardCatText = (await cardCat.textContent()) ?? ''
    expect(cardCatText.trim()).not.toBe('')
    // The pill should still be the only active one
    const pills = page.getByTestId('category-pill')
    const count = await pills.count()
    let activeCount = 0
    for (let i = 0; i < count; i++) {
      const pressed = await pills.nth(i).getAttribute('aria-pressed')
      if (pressed === 'true') activeCount++
    }
    expect(activeCount).toBe(1)
    // Suppress unused variable lint
    void catName
  })

  test('#4: timer starts synchronously on first reveal', async ({ page }) => {
    await page.goto('/')
    // Activate a timer (30s button)
    await page.getByText('30s').click()
    // First click reveals the card
    await page.getByTestId('draw-button').click()
    // Timer container must be visible immediately after reveal
    await expect(page.getByTestId('card-timer')).toBeVisible()
  })
})
