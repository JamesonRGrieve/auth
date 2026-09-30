// SPDX-License-Identifier: AGPL-3.0-or-later
import { render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { testAuthConfig } from '../tests/fixtures/authConfig';
import { AuthenticationContext } from './AuthenticationContext';
import Subscribe, { STRIPE_PRICING_TABLE_SCRIPT } from './Subscribe';

const renderSubscribe = (searchParams: Record<string, string | undefined> = {}): ReturnType<typeof render> =>
  render(
    <AuthenticationContext value={testAuthConfig}>
      <Subscribe searchParams={searchParams} />
    </AuthenticationContext>,
  );

describe('Subscribe', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    document.head.querySelectorAll(`script[src="${STRIPE_PRICING_TABLE_SCRIPT}"]`).forEach((script) => {
      script.remove();
    });
  });

  const stripeScripts = (): number => document.head.querySelectorAll(`script[src="${STRIPE_PRICING_TABLE_SCRIPT}"]`).length;

  it('loads Stripe’s script from the app’s code, once, and only when a table is configured', () => {
    vi.stubEnv('NEXT_PUBLIC_STRIPE_PRICING_TABLE_ID', '');
    renderSubscribe().unmount();
    expect(stripeScripts()).toBe(0);

    vi.stubEnv('NEXT_PUBLIC_STRIPE_PRICING_TABLE_ID', 'prctbl_1');
    const view = renderSubscribe();
    // Not a server-rendered tag, which would carry no CSP nonce.
    expect(view.container.querySelector('script')).toBeNull();
    renderSubscribe();
    expect(stripeScripts()).toBe(1);
  });

  it('says subscribing is not available when no hosted pricing table is configured', () => {
    vi.stubEnv('NEXT_PUBLIC_STRIPE_PRICING_TABLE_ID', '');
    const view = renderSubscribe();
    expect(view.getByRole('status')).toHaveTextContent('Subscriptions are not available here yet');
    expect(view.container.querySelector('stripe-pricing-table')).toBeNull();
  });

  it('shows the provider’s hosted pricing table for the signed-in email when configured', () => {
    vi.stubEnv('NEXT_PUBLIC_STRIPE_PRICING_TABLE_ID', 'prctbl_1');
    vi.stubEnv('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', 'pk_test_1');
    const view = renderSubscribe({ email: 'ada@example.com' });
    const table = view.container.querySelector('stripe-pricing-table');
    expect(table).toHaveAttribute('pricing-table-id', 'prctbl_1');
    expect(table).toHaveAttribute('publishable-key', 'pk_test_1');
    expect(table).toHaveAttribute('customer-email', 'ada@example.com');
  });

  it('hands a customer session to the table instead of an email', () => {
    vi.stubEnv('NEXT_PUBLIC_STRIPE_PRICING_TABLE_ID', 'prctbl_1');
    const view = renderSubscribe({ customer_session: 'cs_1', email: 'ada@example.com' });
    const table = view.container.querySelector('stripe-pricing-table');
    expect(table).toHaveAttribute('customer-session-client-secret', 'cs_1');
    expect(table).not.toHaveAttribute('customer-email');
  });
});
