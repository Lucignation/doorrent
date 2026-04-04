import { expect, test } from '@playwright/test';

test.describe('crisp widget', () => {
  test('public homepage loads the Crisp widget on desktop web', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'This check is only for desktop web.');

    const consoleMessages: string[] = [];
    const pageErrors: string[] = [];
    const crispRequests: string[] = [];
    const crispResponses: string[] = [];
    const failedRequests: string[] = [];
    let crispDomSummary = 'none';

    page.on('console', (message) => {
      if (message.type() === 'error' || /crisp/i.test(message.text())) {
        consoleMessages.push(`${message.type()}: ${message.text()}`);
      }
    });

    page.on('pageerror', (error) => {
      pageErrors.push(error.message);
    });

    page.on('request', (request) => {
      if (/crisp/i.test(request.url())) {
        crispRequests.push(request.url());
      }
    });

    page.on('response', (response) => {
      if (/crisp/i.test(response.url())) {
        crispResponses.push(`${response.status()} ${response.url()}`);
      }
    });

    page.on('requestfailed', (request) => {
      if (/crisp/i.test(request.url())) {
        failedRequests.push(
          `${request.url()} :: ${request.failure()?.errorText ?? 'request failed'}`,
        );
      }
    });

    await page.goto('/');

    await expect
      .poll(async () =>
        page.evaluate(() => {
          const globalWindow = window as typeof window & {
            CRISP_WEBSITE_ID?: string;
          };

          return globalWindow.CRISP_WEBSITE_ID ?? null;
        }),
      )
      .toBe('253c7d70-9d38-452e-a086-76c013b18c88');

    let scriptFound = false;
    let crispRequestFound = false;
    let crispResponseFound = false;

    const loaded = await expect
      .poll(async () => {
        scriptFound = await page.evaluate(() =>
          Array.from(document.scripts).some((script) =>
            (script.src || '').includes('client.crisp.chat/l.js'),
          ),
        );

        crispRequestFound = crispRequests.some((url) => url.includes('client.crisp.chat'));
        crispResponseFound = crispResponses.some((entry) => entry.includes('client.crisp.chat'));

        return scriptFound && crispRequestFound && crispResponseFound;
      }, { timeout: 5000 })
      .toBe(true)
      .then(() => true)
      .catch(() => false);

    crispDomSummary = await page.evaluate(() => {
      const selectors = [
        ...Array.from(document.querySelectorAll('[id*="crisp"], [class*="crisp"], crisp-client')),
      ]
        .slice(0, 10)
        .map((element) => {
          const htmlElement = element as HTMLElement;
          const computed = window.getComputedStyle(htmlElement);
          return `${element.tagName.toLowerCase()}#${element.id || '-'}.${
            htmlElement.className || '-'
          }[display=${computed.display};visibility=${computed.visibility};opacity=${computed.opacity}]`;
        });

      return selectors.join(' | ') || 'none';
    });

    expect(
      loaded,
      [
        'Crisp widget did not finish loading on desktop web.',
        `Script tag found: ${scriptFound}`,
        `Crisp request found: ${crispRequestFound}`,
        `Crisp response found: ${crispResponseFound}`,
        `Crisp DOM: ${crispDomSummary}`,
        `Crisp requests: ${crispRequests.join(' | ') || 'none'}`,
        `Crisp responses: ${crispResponses.join(' | ') || 'none'}`,
        `Console: ${consoleMessages.join(' | ') || 'none'}`,
        `Page errors: ${pageErrors.join(' | ') || 'none'}`,
        `Failed requests: ${failedRequests.join(' | ') || 'none'}`,
      ].join('\n'),
    ).toBe(true);
  });
});
