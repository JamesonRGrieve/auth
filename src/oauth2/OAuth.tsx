'use client';
// SPDX-License-Identifier: AGPL-3.0-or-later

import { Button } from '@jgrieve/forms/components/ui/button';
import { type ReactElement, useState } from 'react';
import { useAuthentication } from '../useAuthentication';
import { oauth2ProviderDisplay } from './OAuthProviders';
import { beginSignIn } from './signIn';

/**
 * A sign-in button for each configured identity provider (`oauthProviders`). Choosing one leaves
 * for the provider; the close page finishes the sign-in when it sends the browser back.
 */
export default function OAuth(): ReactElement | null {
  const authConfig = useAuthentication();
  const [pending, setPending] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  if (authConfig.oauthProviders.length === 0) {
    return null;
  }

  const signIn = (provider: string): void => {
    setPending(true);
    void (async (): Promise<void> => {
      try {
        const authorizeUrl = await beginSignIn(authConfig.authServer, provider, window.sessionStorage);
        window.location.assign(authorizeUrl);
      } catch (error) {
        setProblem(error instanceof Error ? error.message : 'Sign-in could not start.');
        setPending(false);
      }
    })();
  };

  return (
    <div className='flex flex-col gap-2'>
      {authConfig.oauthProviders.map((provider) => {
        const { label, icon } = oauth2ProviderDisplay(provider);
        return (
          <Button
            key={provider}
            variant='outline'
            type='button'
            disabled={pending}
            className='space-x-1 bg-transparent'
            onClick={() => signIn(provider)}
          >
            <span className='text-lg' aria-hidden>
              {icon}
            </span>
            <span>Continue with {label}</span>
          </Button>
        );
      })}
      {problem !== null && (
        <p role='alert' className='text-sm text-destructive'>
          {problem}
        </p>
      )}
    </div>
  );
}
