'use client';
// SPDX-License-Identifier: AGPL-3.0-or-later

import { type ReactNode, useEffect, useState } from 'react';
import { signedInDestination } from '../lib/afterSignIn';
import { useAuthentication } from '../useAuthentication';
import { finishLink } from './link';
import { takePending } from './pending';
import { finishSignIn } from './signIn';

export type CloseProps = Record<string, never>;

/**
 * Where a provider sends the browser back (`<authPath>/close/<provider>`; list it in the server's
 * redirect allowlist). It finishes whatever this browser started there: a sign-in continues where
 * the user was headed, a new link opens the account page. Anything else was a popup, which closes.
 */
export default function Close(): ReactNode {
  const authConfig = useAuthentication();
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    const pending = takePending(window.sessionStorage, new URLSearchParams(window.location.search));
    if (pending === null) {
      window.close();
      return;
    }
    void (async (): Promise<void> => {
      try {
        if (pending.kind === 'signIn') {
          await finishSignIn(authConfig.authServer, pending.provider, pending.code, pending.state);
          window.location.replace(signedInDestination(authConfig));
        } else {
          await finishLink(authConfig.authServer, pending.provider, pending.code, pending.state);
          window.location.replace(`${authConfig.authPath}${authConfig.manage.path}`);
        }
      } catch (error) {
        setProblem(error instanceof Error ? error.message : 'The provider’s answer could not be used.');
      }
    })();
  }, [authConfig]);

  if (problem !== null) {
    return (
      <p role='alert' className='text-sm text-destructive'>
        That did not work: {problem}
      </p>
    );
  }
  return authConfig.close.heading !== undefined && authConfig.close.heading !== '' ? (
    <h2 className='text-3xl'>{authConfig.close.heading}</h2>
  ) : null;
}
