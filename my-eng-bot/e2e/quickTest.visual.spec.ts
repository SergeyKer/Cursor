import { expect, test } from '@playwright/test'

test.describe('Quick test visual', () => {
  test.use({
    viewport: { width: 360, height: 640 },
  })

  test('lobby levels snapshot', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/test')
    await expect(page.getByRole('button', { name: /A1 - начальный/i })).toBeVisible({
      timeout: 15000,
    })
    await expect(page.locator('.dialog-composer-dock')).toBeVisible()
    await expect(page.locator('.app-footer-surface')).toBeVisible()
    await expect(page).toHaveScreenshot('qt-lobby-levels.png', { fullPage: true })
  })

  test('q1 snapshot', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/test/who-likes')
    await expect(page.getByText(/Who/i).first()).toBeVisible({ timeout: 15000 })
    await expect(page.locator('.dialog-composer-dock')).toBeVisible()
    await expect(page.locator('.app-footer-surface')).toBeVisible()
    await expect(page).toHaveScreenshot('qt-q1.png', { fullPage: true })
  })
})
