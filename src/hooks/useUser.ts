import { createGraphQLClient } from '@/interactive/hooks/lib';
import log from '@/next-log/log';
import '@/zod2gql/zod2gql';
import { getCookie } from 'cookies-next';
import useSWR, { SWRResponse } from 'swr';
import { User, UserSchema } from './z';
/**
 * Hook to fetch and manage current user data
 * @returns SWR response containing user data
 */
export function useUser(): SWRResponse<User | null> {
  const client = createGraphQLClient();

  return useSWR<User | null>(
    ['/user', getCookie('jwt')],
    async (): Promise<User | null> => {
      if (!getCookie('jwt')) {
        return null;
      }
      try {
        const query = UserSchema.toGQL('query', 'GetUser');
        log(['GQL useUser() Query', query], {
          client: 3,
        });
        const response = await client.request<{ user: User }>(query);
        log(['GQL useUser() Response', response], {
          client: 3,
        });
        return UserSchema.parse(response.user);
      } catch (error) {
        log(['GQL useUser() Error', error], {
          client: 1,
        });
        return {
          id: '',
          email: '',
          firstName: '',
          lastName: '',
          userTeams: [],
          agents: [],
        };
      }
    },
    {
      fallbackData: {
        id: '',
        email: '',
        firstName: '',
        lastName: '',
        userTeams: [],
        agents: [],
      },
    },
  );
}
