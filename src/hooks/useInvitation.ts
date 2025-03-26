import { createGraphQLClient } from '@/interactive/hooks/lib';
import log from '@/next-log/log';
import '@/zod2gql/zod2gql';
import useSWR, { SWRResponse } from 'swr';
import { Invitation, InvitationSchema } from './z';
/**
 * Hook to fetch and manage invitations
 * @param teamId - Optional team ID to fetch invitations for
 * @returns SWR response containing array of invitations
 */
export function useInvitations(teamId?: string): SWRResponse<Invitation[]> {
  const client = createGraphQLClient();

  return useSWR<Invitation[]>(
    teamId ? [`/invitations`, teamId] : '/invitations',
    async (): Promise<Invitation[]> => {
      if (!teamId) {
        return [];
      }
      try {
        const query = InvitationSchema.toGQL('query', 'GetInvitations', { teamId });
        const response = await client.request<{ invitations: Invitation[] }>(query, { teamId });

        if (!response || !response.invitations) {
          return [];
        }

        // Parse and validate the response
        return response.invitations.map((invitation) => InvitationSchema.parse(invitation));
      } catch (error) {
        log(['GQL useInvitations() Error', error], {
          client: 1,
        });
        return [];
      }
    },
    { fallbackData: [] },
  );
}
