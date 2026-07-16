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

  test('finale sheet via debugFinale', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/test/who-likes?debugFinale=1')
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 15000 })
    await expect(page.getByRole('heading', { name: 'Результат' })).toBeVisible()
    await expect(page.getByText('Прогон без ответов')).toBeVisible()
    await expect(page.getByText('Нормальный старт')).toHaveCount(0)
    await expect(page.getByLabel('Закрыть')).toHaveCount(0)
    await expect(page.getByRole('button', { name: /Пройти тему в уроке с нуля/i })).toBeVisible()
    await expect(page.locator('.dialog-composer-dock')).toBeVisible()
    await expect(page.getByText('Загрузка результата')).toHaveCount(0)
  })

  test('finale other test navigates to lobby', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/test/who-likes?debugFinale=1')
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 15000 })
    await page.getByRole('button', { name: 'Другой тест' }).first().click()
    await expect(page).toHaveURL(/\/test$/)
  })
})
