import { expect, test } from '@playwright/test';

test.describe('public smoke flows', () => {
  test('landing page renders pricing and enterprise request flow', async ({ page }) => {
    await page.goto('/');

    await expect(
      page.getByRole('heading', { name: /Basic, Pro, or Enterprise/i }),
    ).toBeVisible();
    await expect(page.getByText('See exactly what sits in each plan.')).toBeVisible();

    const enterpriseCta = page.getByRole('link', { name: /Request Enterprise Setup/i });
    await enterpriseCta.scrollIntoViewIfNeeded();
    await enterpriseCta.click();

    await expect(
      page.getByRole('heading', {
        name: /Let’s set up a branded workspace for your property company\./i,
      }),
    ).toBeVisible();

    await page.getByLabel('Company name').fill('Lekki Property Holdings Ltd');
    await page.getByLabel('Contact name').fill('Babatunde Adeyemi');
    await page.getByLabel('Work email').fill('ops@lekki.io');
    await page.getByLabel('Phone number').fill('+2348012345678');
    await page
      .getByLabel('Portfolio size')
      .fill('120 units across 8 properties');
    await page.getByLabel('Primary city').fill('Lagos');
    await page
      .getByLabel('Setup goals')
      .fill('We need branding, collections setup, and role-based workspace rollout.');

    await page.getByRole('button', { name: /Send Enterprise Request/i }).click();

    await expect(
      page.getByText(/Enterprise onboarding request sent successfully/i),
    ).toBeVisible();
  });

  test('root portal keeps public account creation available', async ({ page }) => {
    await page.goto('/portal');

    await expect(page.getByText(/Sign in to your DoorRent workspace/i)).toBeVisible();
    await expect(
      page.getByRole('button', { name: /Create account/i }),
    ).toBeVisible();

    await page.getByRole('button', { name: /Create account/i }).click();

    await expect(page.getByText('Choose your plan')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Basic' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Pro' })).toBeVisible();
  });
});
