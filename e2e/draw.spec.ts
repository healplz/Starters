import { test, expect } from '@playwright/test'

test.describe('draw flow', () => {
  test('card starts face-down, flips on first draw', async ({ page }) => {
    await page.goto('/')
    const drawBtn = page.getByTestId('draw-button')
    await expect(drawBtn).toHaveText('Draw')
    await drawBtn.click()
    await expect(drawBtn).toHaveText('Draw Another')
  })

  test('second draw records history', async ({ page }) => {
    await page.goto('/')
    const drawBtn = page.getByTestId('draw-button')
    await drawBtn.click()
    await drawBtn.click()
    await expect(page.getByTestId('history-tab')).toBeVisible()
    await expect(page.getByTestId('history-count')).toHaveText('1')
  })

  test('history drawer opens and lists the previous question', async ({ page }) => {
    await page.goto('/')
    const drawBtn = page.getByTestId('draw-button')

    // First draw — capture the question text
    await drawBtn.click()
    const firstQuestion = (await page.getByTestId('card-question').textContent()) ?? ''

    // Second draw records the first card into history
    await drawBtn.click()

    await page.getByTestId('history-tab').click()
    const drawer = page.getByTestId('history-drawer')
    await expect(drawer).toBeInViewport()
    await expect(drawer).toContainText(firstQuestion)
  })
})