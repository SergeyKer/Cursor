import { expect, test } from '@playwright/test'

test.describe('Quick test flow', () => {
  test('deep link shows Q1', async ({ page }) => {
    await page.goto('/test/who-likes')
    await expect(page.getByText(/Who ___ pizza\?|Who/i).first()).toBeVisible({ timeout: 15000 })
    await expect(page.getByRole('button').filter({ hasText: /likes|like|does/i }).first()).toBeVisible()
  })

  test('lobby shows level chips after intro', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/test')
    await expect(page.getByRole('button', { name: /A2 - элементарный/i })).toBeVisible({
      timeout: 15000,
    })
    await expect(page.getByRole('button', { name: /Не знаю/i })).toBeVisible()
  })

  test('lobby shows preparing status after topic pick', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.setViewportSize({ width: 360, height: 640 })
    await page.goto('/test')
    const a1Chip = page.getByRole('button', { name: /A1 - начальный/i })
    await expect(a1Chip).toBeVisible({ timeout: 15000 })
    await a1Chip.click()
    const firstTopic = page.getByRole('button', { name: /I am \/ I am from/i })
    await expect(firstTopic).toBeVisible({ timeout: 15000 })
    const statusLine = page.locator('[data-feed-service-status]')
    await Promise.all([
      statusLine.waitFor({ state: 'visible', timeout: 2000 }),
      firstTopic.click(),
    ])
    await expect(statusLine).toContainText('Engvo готовит задание')
  })

  test('unknown slug is 404', async ({ page }) => {
    const res = await page.goto('/test/not-a-real-slug-xyz')
    expect(res?.status()).toBe(404)
  })
})
