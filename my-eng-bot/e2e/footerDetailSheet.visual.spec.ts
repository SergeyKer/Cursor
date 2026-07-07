import { expect, test } from '@playwright/test'

const harnessUrl = (theme: string, source: 'dynamic' | 'static', open: boolean) =>
  `/__test__/footer-sheet?theme=${theme}&source=${source}&open=${open ? '1' : '0'}`

test.describe('Footer detail sheet visual regression', () => {
  test('bubble2 dynamic open keeps footer visible', async ({ page }) => {
    await page.goto(harnessUrl('bubble2', 'dynamic', true))
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Подсказка' })).toBeVisible()
    await expect(page.getByText('В разработке')).toBeVisible()
    await expect(page.getByTestId('footer-sheet-harness-footer')).toBeVisible()
    await expect(page).toHaveScreenshot('footer-sheet-bubble2-dynamic-open.png', {
      fullPage: true,
    })
  })

  test('glass1 static open', async ({ page }) => {
    await page.goto(harnessUrl('glass1', 'static', true))
    await expect(page.getByRole('heading', { name: 'Статистика' })).toBeVisible()
    await expect(page).toHaveScreenshot('footer-sheet-glass1-static-open.png', {
      fullPage: true,
    })
  })

  test('bubble2 closed baseline', async ({ page }) => {
    await page.goto(harnessUrl('bubble2', 'dynamic', false))
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(page).toHaveScreenshot('footer-sheet-bubble2-closed.png', {
      fullPage: true,
    })
  })
})
