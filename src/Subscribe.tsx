'use client';
// SPDX-License-Identifier: AGPL-3.0-or-later

import { getCookie } from 'cookies-next/client';
import { Suspense } from 'react';
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

  return (
    <>
      {authConfig.subscribe.heading !== undefined && authConfig.subscribe.heading !== '' && (
        <h2 className='text-3xl'>{authConfig.subscribe.heading}</h2>
      )}
      {process.env.NEXT_PUBLIC_STRIPE_PRICING_TABLE_ID !== undefined &&
      process.env.NEXT_PUBLIC_STRIPE_PRICING_TABLE_ID !== '' ? (
        <Suspense fallback={<p>Loading pricing...</p>}>
          <h1>Subscribe</h1>
          <div id='stripe-box'>
            <script async src='https://js.stripe.com/v3/pricing-table.js' />
            <stripe-pricing-table
              pricing-table-id={process.env.NEXT_PUBLIC_STRIPE_PRICING_TABLE_ID}
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
