import { expect, test } from '@playwright/test';

test.describe('public smoke flows', () => {
  test('tenant onboarding shows explicit validation and submits with a guarantor link', async ({
    page,
  }) => {
    await page.goto('http://lekki.localhost:3100/tenant/onboarding/demo-tenant-onboarding-token');

    await expect(page.getByText('Lekki Property Holdings Ltd').first()).toBeVisible();

    const detailsCard = page.locator('.card').filter({ hasText: 'Your Details' });
    const guarantorCard = page.locator('.card').filter({ hasText: 'Guarantor Information' });
    const submitButton = page.getByRole('button', { name: /Submit Onboarding/i });
    await expect(submitButton).toBeDisabled();

    await detailsCard.locator('input').nth(3).fill('+2348012345678');
    await detailsCard
      .locator('textarea')
      .first()
      .fill('14 Broad Street, Lagos Island, Lagos State');
    await guarantorCard.locator('input').nth(0).fill('Chinedu Okafor');
    await guarantorCard.locator('input').nth(1).fill('Brother');
    await guarantorCard.locator('input').nth(2).fill('not-an-email');
    await expect(page.getByText('Enter a valid guarantor email address.')).toBeVisible();

    await guarantorCard.locator('input').nth(2).fill('chinedu@example.com');
    await guarantorCard.locator('input').nth(3).fill('+2348098765432');
    await guarantorCard.locator('input').nth(4).fill('Civil Engineer');
    await guarantorCard.locator('input').nth(5).fill('BuildRight Limited');
    await guarantorCard
      .locator('textarea')
      .fill('5 Adeola Odeku Street, Victoria Island, Lagos State');

    const signatureCanvas = page.locator('form #sig-canvas').first();
    const box = await signatureCanvas.boundingBox();

    if (!box) {
      throw new Error('Signature canvas was not available for onboarding smoke test.');
    }

    await page.mouse.move(box.x + 20, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 + 10, {
      steps: 8,
    });
    await page.mouse.move(box.x + box.width - 20, box.y + box.height / 2 - 10, {
      steps: 8,
    });
    await page.mouse.up();

    await expect(submitButton).toBeEnabled();
    await submitButton.click();

    await expect(page.getByText('Onboarding submitted successfully.')).toBeVisible();
    await expect(page.getByText(/Share with your guarantor/i)).toBeVisible();
    await expect(page.locator('input[readonly]').last()).toHaveValue(
      /guarantor_demo_token/i,
    );
  });

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
