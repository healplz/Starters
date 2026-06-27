import { test, expect } from '@playwright/test'

test.describe('keyboard shortcuts', () => {
  test('Space draws, then records history, then h toggles drawer, Esc closes', async ({ page }) => {
    await page.goto('/')
    const drawBtn = page.getByTestId('draw-button')

    await page.keyboard.press('Space')
    await expect(drawBtn).toHaveText('Draw Another')

    await page.keyboard.press('Space')
    await expect(page.getByTestId('history-count')).toHaveText('1')

    await page.keyboard.press('h')
    const drawer = page.getByTestId('history-drawer')
    await expect(drawer).toBeInViewport()

    await page.keyboard.press('Escape')
    await expect(drawer).not.toBeInViewport()
  })
})