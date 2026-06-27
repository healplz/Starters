import { test, expect } from '@playwright/test'

test.describe('favorites', () => {
  test('save and unsave a card via the action-row button', async ({ page }) => {
    await page.goto('/')
    // Card is pre-loaded face-down; favorite button should be visible immediately
    const favBtn = page.getByTestId('favorite-button')
    await expect(favBtn).toHaveAttribute('aria-pressed', 'false')
    await favBtn.click()
    await expect(favBtn).toHaveAttribute('aria-pressed', 'true')
    await expect(favBtn).toContainText('Saved')

    // Open drawer — visible because favorites > 0
    await page.getByTestId('history-tab').click()
    await expect(page.getByTestId('favorites-section')).toBeVisible()

    // Remove from favorites via drawer star
    await page.getByTestId('favorite-remove').click()
    await expect(page.getByTestId('favorites-section')).not.toBeVisible()
    await expect(favBtn).toHaveAttribute('aria-pressed', 'false')
  })
})