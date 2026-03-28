import { expect, test } from '@playwright/test';

test.describe('workspace subdomain smoke flows', () => {
  test('workspace root redirects to portal and hides public account creation', async ({
    page,
  }) => {
    await page.goto('http://lekki.localhost:3100/');

    await page.waitForURL('http://lekki.localhost:3100/portal');
    await expect(page.getByText('Lekki Property Holdings Ltd')).toBeVisible();
    await expect(page.getByText(/Need your own workspace\?/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Create account/i })).toHaveCount(0);

    const brandAccent = await page.locator('#auth-screen').evaluate((element) =>
      getComputedStyle(element).getPropertyValue('--accent').trim(),
    );

    expect(brandAccent).toBe('#8A1538');

    await expect(page.locator('.auth-logo-image')).toHaveAttribute(
      'src',
      /lekki-logo\.png/,
    );
  });

  test('workspace-specific tenant and caretaker links stay on the same subdomain', async ({
    page,
  }) => {
    await page.goto('http://lekki.localhost:3100/portal');

    await page.getByRole('link', { name: 'Tenant Login' }).click();
    await page.waitForURL('http://lekki.localhost:3100/tenant/login');
    await expect(page.locator('.auth-logo-name')).toHaveText('Lekki Property Holdings Ltd');

    await page.goto('http://lekki.localhost:3100/portal');
    await page.getByRole('link', { name: 'Caretaker Login' }).click();
    await page.waitForURL('http://lekki.localhost:3100/caretaker/login');
    await expect(page.locator('.auth-logo-name')).toHaveText('Lekki Property Holdings Ltd');
  });

  test('different workspace hosts resolve different branding', async ({ page }) => {
    await page.goto('http://abuja.localhost:3100/portal');

    await expect(page.getByText('Abuja Prime Estates')).toBeVisible();

    const brandAccent = await page.locator('#auth-screen').evaluate((element) =>
      getComputedStyle(element).getPropertyValue('--accent').trim(),
    );

    expect(brandAccent).toBe('#0E5A8A');
    await expect(page.locator('.auth-logo-image')).toHaveAttribute(
      'src',
      /abuja-logo\.png/,
    );
  });
});
