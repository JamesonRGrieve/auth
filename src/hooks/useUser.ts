// SPDX-License-Identifier: AGPL-3.0-or-later
import { useMemo } from 'react';
import useSWR, { type SWRResponse } from 'swr';
import { GQLType, toGQL } from 'zod2gql';
import { useAuthServer } from '../AuthServerContext';
import log from '../lib/log';
import { createGraphQLClient } from './lib';
import { type User, UserSchema } from './z';

/**
 * The signed-in user, or null when there is no session (the session cookie is HttpOnly, so
 * the request itself is the only way to tell).
 */
export function useUser(): SWRResponse<User | null> {
  const authServer = useAuthServer();
  const client = useMemo(() => createGraphQLClient(authServer), [authServer]);

  return useSWR<User | null>(
    [authServer, '/user'],
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
