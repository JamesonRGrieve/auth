// SPDX-License-Identifier: AGPL-3.0-or-later
import { useMemo } from 'react';
import useSWR, { type SWRResponse } from 'swr';
import { GQLType, toGQL } from 'zod2gql';
import { useAuthServer } from '../AuthServerContext';
import log from '../lib/log';
import { hasSession } from '../lib/session';
import { createGraphQLClient } from './lib';
import { type User, UserSchema } from './z';

/**
 * The signed-in user, or null when there is no session. A browser without one asks nothing: the
 * app shell calls this on every page, and a signed-out visitor would only draw a 401.
 */
export function useUser(): SWRResponse<User | null> {
  const authServer = useAuthServer();
  const client = useMemo(() => createGraphQLClient(authServer), [authServer]);

  return useSWR<User | null>(
    hasSession() ? [authServer, '/user'] : null,
    async (): Promise<User | null> => {
      try {
        const query = toGQL(UserSchema, GQLType.Query, { operationName: 'GetUser' });
        const response = await client.request<{ user: User }>(query);
        return UserSchema.parse(response.user);
      } catch (error: unknown) {
        log(['GQL useUser() Error', error], { client: 1 });
        return null;
      }
    },
    { fallbackData: null },
  );
}
