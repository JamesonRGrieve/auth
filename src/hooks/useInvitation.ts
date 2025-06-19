import log from '@/next-log/log';
import '@/zod2gql';
import useSWR, { SWRResponse } from 'swr';
import { createGraphQLClient } from './lib';
import { Invitation, InvitationSchema } from './z';
import { getCookie } from 'cookies-next';
import axios from 'axios';
/**
 * Hook to fetch and manage invitations
 * @param teamId - Optional team ID to fetch invitations for
 * @returns SWR response containing array of invitations
 */

export function useInvitations(teamId?: string): SWRResponse<Invitation[]> {
  return useSWR<Invitation[]>(
    teamId ? [`/v1/team/${teamId}/invitation`, teamId] : null,
    async (): Promise<Invitation[]> => {
      if (!teamId) return [];
      try {
        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URI}/v1/team/${teamId}/invitation`,
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${getCookie('jwt')}`,
            },
          }
        );
        // Adjust this if your API response structure is different
        return response.data?.invitations || [];
      } catch (error) {
        log(['REST useInvitationsByUserId() Error', error], { client: 1 });
        return [];
      }
    },
    { fallbackData: [] }
  );
}
