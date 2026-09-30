'use client';
// SPDX-License-Identifier: AGPL-3.0-or-later
import { createContext, type ReactNode, useContext } from 'react';

const AuthServerContext = createContext<string | null>(null);

/**
 * Where the auth hooks reach the API: an absolute URL, or a path on the app's own origin
 * (e.g. `/api` for an in-process API, or empty to call `/v1/...` on the app origin). The app
 * provides it once, from its single configured server base URL.
 */
export function AuthServerProvider({ baseUrl, children }: { baseUrl: string; children: ReactNode }): ReactNode {
  return <AuthServerContext value={baseUrl.replace(/\/$/, '')}>{children}</AuthServerContext>;
}

/** The API base the app configured. Throws outside an AuthServerProvider, so a missing setup is loud. */
export function useAuthServer(): string {
  const baseUrl = useContext(AuthServerContext);
  if (baseUrl === null) {
    throw new Error('useAuthServer must be used within an AuthServerProvider');
  }
  return baseUrl;
}
