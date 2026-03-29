import { expect, test } from '@playwright/test';

test.describe('workspace subdomain smoke flows', () => {
  test('landlord settings can open plan options and upgrade a Basic workspace to Pro', async ({
    page,
  }, testInfo) => {
    const landlordToken = `token_landlord_lekki_${testInfo.project.name}`;

    await page.addInitScript((session) => {
      window.sessionStorage.setItem('doorrent.landlord.session', JSON.stringify(session));
    }, {
      token: landlordToken,
      expiresAt: '2099-04-30T00:00:00.000Z',
      landlord: {
        id: 'll_lekki',
        role: 'landlord',
        companyName: 'Lekki Property Holdings Ltd',
        workspaceMode: 'PROPERTY_MANAGER_COMPANY',
        workspaceSlug: 'lekki',
        firstName: 'Babatunde',
        lastName: 'Adeyemi',
        fullName: 'Babatunde Adeyemi',
        email: 'ops@lekki.io',
        plan: 'basic',
        planKey: 'STARTER',
        subscriptionModel: 'subscription',
        branding: {
          displayName: 'Lekki Property Holdings Ltd',
          logoUrl: 'https://example.com/assets/lekki-logo.png',
          loginBackgroundUrl: 'https://example.com/assets/lekki-login-bg.jpg',
          primaryColor: '#8A1538',
          accentColor: '#C8A45A',
        },
      },
    });

    await page.goto('http://lekki.localhost:3100/landlord/settings');

    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
    await expect(page.getByText('Basic')).toBeVisible();
    await page.getByRole('button', { name: /Upgrade Plan/i }).click();
    await expect(page.getByText('3% of rent collected')).toBeVisible();
    await page.getByRole('button', { name: /Switch to Pro/i }).click();

    await expect(page.getByText(/Workspace plan updated successfully/i)).toBeVisible();
    await expect(
      page.getByText(/Pro workspaces can now log offline rent collections/i),
    ).toBeVisible();
  });

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
