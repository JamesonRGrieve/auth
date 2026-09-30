'use client';
// SPDX-License-Identifier: AGPL-3.0-or-later

import { useRouter } from 'next/navigation.js';
import { type ReactNode, useEffect, useState } from 'react';
import { AuthApiError, authSend } from './lib/api';
import { safeRedirectPath } from './lib/redirect';
import { useAuthentication } from './useAuthentication';

export type LogoutProps = { redirectTo?: string };

const LOGOUT_ENDPOINT = '/v1/user/logout';
const UNAUTHORIZED = 401;

/**
 * Ends the session on the server (POST /v1/user/logout revokes it and clears the HttpOnly
 * cookies, which scripts cannot), then leaves for `redirectTo`.
 */
export default function Logout({ redirectTo = '/' }: LogoutProps): ReactNode {
  const router = useRouter();
  const authConfig = useAuthentication();
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    const leave = (): void => {
      router.replace(safeRedirectPath(redirectTo));
      router.refresh();
    };
    void (async (): Promise<void> => {
      try {
        await authSend(`${authConfig.authServer}${LOGOUT_ENDPOINT}`, { method: 'POST', body: {} });
        leave();
      } catch (failure) {
        // 401: the session had already ended, which is what signing out wants.
        if (failure instanceof AuthApiError && failure.status === UNAUTHORIZED) {
          leave();
          return;
        }
        setProblem(failure instanceof Error ? failure.message : 'Signing out failed.');
      }
    })();
  }, [authConfig.authServer, router, redirectTo]);

  if (problem !== null) {
    return (
      <p role='alert' className='text-sm text-destructive'>
        Signing out failed: {problem}
      </p>
    );
  }
  const heading = authConfig.logout.heading ?? '';
  return heading === '' ? null : <h1 className='text-3xl'>{heading}</h1>;
}
