// SPDX-License-Identifier: AGPL-3.0-or-later
import type { ReactNode } from 'react';
import { SWRConfig } from 'swr';
import { AuthServerProvider } from '../../src/AuthServerContext';

/**
 * A renderHook wrapper for hooks that call the API: `baseUrl` as the app's API base, and a fresh,
 * non-deduplicating SWR cache so each test sees its own requests.
 */
export const withApi =
  (baseUrl: string) =>
  ({ children }: { children: ReactNode }): ReactNode => (
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      <AuthServerProvider baseUrl={baseUrl}>{children}</AuthServerProvider>
    </SWRConfig>
  );
