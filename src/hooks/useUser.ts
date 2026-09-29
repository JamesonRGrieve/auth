// SPDX-License-Identifier: AGPL-3.0-or-later
import { getCookie } from 'cookies-next/client';
import useSWR, { type SWRResponse } from 'swr';
import { GQLType, toGQL } from 'zod2gql';
import log from '../lib/log';
import { createGraphQLClient } from './lib';
import { type User, UserSchema } from './z';
/**
 * Hook to fetch and manage current user data
 * @returns SWR response containing user data
 */
export function useUser(): SWRResponse<User | null> {
  const client = createGraphQLClient();

  return useSWR<User | null>(
    ['/user', getCookie('jwt')],
    async (): Promise<User | null> => {
      const jwt = getCookie('jwt');
      if (jwt === undefined || jwt === '') {
        return null;
      }
      try {
        const query = toGQL(UserSchema, GQLType.Query, { operationName: 'GetUser' });
        log(['GQL useUser() Query', query], {
          client: 3,
        });
        const response = await client.request<{ user: User }>(query);
        log(['GQL useUser() Response', response], {
          client: 3,
        });
        return UserSchema.parse(response.user);
      } catch (error: unknown) {
        log(['GQL useUser() Error', error], {
          client: 1,
        });
        return null;
      }
    },
    {
      fallbackData: null,
    },
  );
}
