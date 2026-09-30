'use client';
// SPDX-License-Identifier: AGPL-3.0-or-later

import { getCookie } from 'cookies-next/client';
import { Suspense, useEffect } from 'react';
import { firstSearchParam } from './lib/searchParams';
import { useAuthentication } from './useAuthentication';

declare module 'react/jsx-runtime' {
  // eslint-disable-next-line @typescript-eslint/no-shadow -- a module augmentation must reuse the name JSX to merge into React's JSX namespace.
  namespace JSX {
    interface IntrinsicElements {
      'stripe-pricing-table': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    }
  }
}

export type SubscribeProps = { redirectTo?: string };

/** Stripe's pricing-table element. Stripe updates it in place, so it cannot carry an integrity hash. */
export const STRIPE_PRICING_TABLE_SCRIPT = 'https://js.stripe.com/v3/pricing-table.js';

/**
 * Loads Stripe's pricing-table script once. It is added from script rather than rendered as a tag:
 * a server-rendered tag has no CSP nonce and 'strict-dynamic' would block it, whereas a script
 * added by the app's own (trusted) code is allowed.
 */
function useStripePricingTableScript(enabled: boolean): void {
  useEffect(() => {
    if (!enabled || document.querySelector(`script[src="${STRIPE_PRICING_TABLE_SCRIPT}"]`) !== null) {
      return;
    }
    const script = document.createElement('script');
    script.src = STRIPE_PRICING_TABLE_SCRIPT;
    script.async = true;
    document.head.append(script);
  }, [enabled]);
}

/**
 * Where a user without a subscription lands (the API answered 402). Plans live in the payment
 * provider: this shows the provider's hosted pricing table when one is configured, and otherwise
 * says subscribing is not available here.
 */
export default function Subscribe({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}): React.JSX.Element {
  const authConfig = useAuthentication();
  const pricingTableId = process.env.NEXT_PUBLIC_STRIPE_PRICING_TABLE_ID ?? '';
  useStripePricingTableScript(pricingTableId !== '');

  return (
    <>
      {authConfig.subscribe.heading !== undefined && authConfig.subscribe.heading !== '' && (
        <h2 className='text-3xl'>{authConfig.subscribe.heading}</h2>
      )}
      {pricingTableId !== '' ? (
        <Suspense fallback={<p>Loading pricing...</p>}>
          <h1>Subscribe</h1>
          <div id='stripe-box'>
            <stripe-pricing-table
              pricing-table-id={pricingTableId}
              publishable-key={process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY}
              customer-session-client-secret={firstSearchParam(searchParams['customer_session'])}
              customer-email={
                searchParams['customer_session'] !== undefined
                  ? undefined
                  : (firstSearchParam(searchParams['email']) ?? getCookie('email'))
              }
            />
          </div>
        </Suspense>
      ) : (
        <p role='status' className='text-sm text-muted-foreground'>
          Subscriptions are not available here yet. Contact the administrator for access.
        </p>
      )}
    </>
  );
}
