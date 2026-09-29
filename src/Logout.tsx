'use client';
// SPDX-License-Identifier: AGPL-3.0-or-later

import { deleteCookie } from 'cookies-next';
import { useRouter } from 'next/navigation.js';
import { type ReactNode, useEffect } from 'react';
import { useAuthentication } from './useAuthentication';
import { cookieDomainOptions } from './utils';

export type LogoutProps = { redirectTo?: string };

export default function Logout({ redirectTo = '/' }: LogoutProps): ReactNode {
  const router = useRouter();
  const authConfig = useAuthentication();

  useEffect(() => {
    void deleteCookie('jwt', cookieDomainOptions());
    router.refresh();
    router.replace(redirectTo);
    router.refresh();
  }, [router, redirectTo]);

  // Moved the conditional rendering here, after all hooks are called
  if (authConfig.logout.heading === undefined || authConfig.logout.heading === '') {
    return null;
  }

  return <h1 className='text-3xl'>{authConfig.logout.heading}</h1>;
}
