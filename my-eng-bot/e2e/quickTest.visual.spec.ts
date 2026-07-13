import { expect, test } from '@playwright/test'

test.describe('Quick test visual', () => {
  test.use({
    viewport: { width: 360, height: 640 },
  })

  test('lobby levels snapshot', async ({ page }) => {
    await page.goto('/test')
    await expect(page.getByRole('button', { name: /A1 - начальный/i })).toBeVisible()
    await expect(page).toHaveScreenshot('qt-lobby-levels.png', { fullPage: true })
  })

  test('q1 snapshot', async ({ page }) => {
    await page.goto('/test/who-likes')
    await expect(page.getByText(/Шаг 1 из 5|Who/i).first()).toBeVisible()
    await expect(page).toHaveScreenshot('qt-q1.png', { fullPage: true })
  })
})
