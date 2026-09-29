import { expect, test } from '@playwright/test';

/**
 * Smoke tests against the static Storybook build. Each test loads a story's
 * iframe URL and asserts a piece of its rendered output is present. Story IDs
 * follow Storybook's slug rule: `<title with slashes>--<story-export-name>`,
 * lowercased, non-alphanumerics replaced by `-`.
 *
 * When you add a new component story, add a smoke test here. A failing test
 * with no asserted text is still better than no test — it catches "the story
 * threw on render" regressions.
 */
test.describe('Storybook integration', () => {
  test('renders the AuthCard default story', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/iframe.html?id=components-authcard--default');
    await expect(page.getByText('Sign In')).toBeVisible();
    await expect(page.getByText('Please enter your credentials to sign in.')).toBeVisible();
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('renders the AuthCard with-back-button variant', async ({ page }) => {
    await page.goto('/iframe.html?id=components-authcard--with-back-button');
    await expect(page.getByText('Sign Up')).toBeVisible();
  });

  test('renders the AuthCard response-message variant', async ({ page }) => {
    await page.goto('/iframe.html?id=components-authcard--with-response-message');
    await expect(page.getByText('An error occurred. Please try again.')).toBeVisible();
  });
});
