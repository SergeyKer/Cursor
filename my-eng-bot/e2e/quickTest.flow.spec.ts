import { expect, test } from '@playwright/test'

test.describe('Quick test flow', () => {
  test('deep link shows Q1', async ({ page }) => {
    await page.goto('/test/who-likes')
    await expect(page.getByText(/Who ___ pizza\?|Who/i).first()).toBeVisible()
    await expect(page.getByRole('button').filter({ hasText: /likes|like|does/i }).first()).toBeVisible()
  })

  test('lobby shows level chips', async ({ page }) => {
    await page.goto('/test')
    await expect(page.getByRole('button', { name: /A2 - элементарный/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /Не знаю/i })).toBeVisible()
  })

  test('unknown slug is 404', async ({ page }) => {
    const res = await page.goto('/test/not-a-real-slug-xyz')
    expect(res?.status()).toBe(404)
  })
})
