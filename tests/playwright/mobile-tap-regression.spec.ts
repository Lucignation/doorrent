import { expect, test } from '@playwright/test';

test.describe('mobile tap regression', () => {
  test('landing page and portal actions respond to taps', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'This regression only applies to mobile web tap behavior.');

    await page.goto('/');

    const getStartedLink = page.getByRole('link', { name: /Get started/i });
    await expect(getStartedLink).toBeVisible();
    await getStartedLink.tap();

    await page.waitForURL(/\/portal$/);
    await expect(page.getByText(/Sign in to your DoorRent workspace/i)).toBeVisible();

    await page.goto('/');

    const menuButton = page.getByRole('button', { name: /Open menu/i });
    await expect(menuButton).toBeVisible();
    await menuButton.tap();

    const mobileMenu = page.locator('.marketing-mobile-menu.is-open');
    await expect(mobileMenu).toBeVisible();
    await mobileMenu.getByRole('link', { name: 'Marketplace' }).tap();

    await page.waitForURL(/\/marketplace$/);

    await page.goto('/portal');

    const tenantLoginLink = page.getByRole('link', { name: 'Tenant Login' });
    await expect(tenantLoginLink).toBeVisible();
    await tenantLoginLink.tap();

    await page.waitForURL(/\/tenant\/login$/);
    await expect(page.getByRole('heading', { name: /Tenant access/i })).toBeVisible();

    await page.goto('/portal');

    const caretakerLoginLink = page.getByRole('link', { name: 'Caretaker Login' });
    await expect(caretakerLoginLink).toBeVisible();
    await caretakerLoginLink.tap();

    await page.waitForURL(/\/caretaker\/login$/);
    await expect(page.getByRole('heading', { name: /Caretaker access/i })).toBeVisible();
  });
});
