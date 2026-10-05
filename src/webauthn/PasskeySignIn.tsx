'use client';
// SPDX-License-Identifier: AGPL-3.0-or-later
import { Button } from '@jgrieve/forms/components/ui/button';
import { type ReactElement, useState } from 'react';
import { useAuthentication } from '../useAuthentication';
import { ceremonyProblem, passkeysSupported, signInWithPasskey } from './webauthnApi';

/**
 * Sign in with a passkey: the account's own when `email` names one, otherwise whichever the
 * browser offers (a passkey names its user). Nothing shows where the browser can't use passkeys.
 */
export function PasskeySignIn({ email, onSignedIn }: { email: string | null; onSignedIn: () => void }): ReactElement | null {
  const { authServer } = useAuthentication();
  const [pending, setPending] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  if (!passkeysSupported()) {
    return null;
  }

  const signIn = async (): Promise<void> => {
    setPending(true);
    setProblem(null);
    try {
      await signInWithPasskey(authServer, email);
      onSignedIn();
    } catch (error) {
      setProblem(error instanceof Error ? ceremonyProblem(error) : 'The passkey could not be used.');
    } finally {
      setPending(false);
    }
  };

  return (
    <div className='flex flex-col gap-2'>
      <Button
        type='button'
        variant='outline'
        disabled={pending}
        onClick={() => {
          void signIn();
        }}
      >
        Sign in with a passkey
      </Button>
      {problem !== null && (
        <p role='alert' className='text-sm text-destructive'>
          {problem}
        </p>
      )}
    </div>
  );
}
