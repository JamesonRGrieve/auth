// SPDX-License-Identifier: AGPL-3.0-or-later
import axios from 'axios';
import { getCookie } from 'cookies-next/client';
import useSWR, { type SWRResponse } from 'swr';
import log from '../lib/log';
import type { Invitation } from './z';
/**
 * Hook to fetch and manage invitations
 * @param teamId - Optional team ID to fetch invitations for
 * @returns SWR response containing array of invitations
 */

export function useInvitations(teamId?: string): SWRResponse<Invitation[]> {
  return useSWR<Invitation[]>(
    teamId !== undefined && teamId !== '' ? [`/v1/team/${teamId}/invitation`, teamId] : null,
    async (): Promise<Invitation[]> => {
      if (teamId === undefined || teamId === '') {
        return [];
      }
      try {
        const response = await axios.get<{ invitations?: Invitation[] }>(
          `${process.env.NEXT_PUBLIC_API_URI}/v1/team/${teamId}/invitation`,
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${getCookie('jwt')}`,
            },
          },
        );
        // Adjust this if your API response structure is different
        return response.data.invitations ?? [];
      } catch (error: unknown) {
        log(['REST useInvitationsByUserId() Error', error], { client: 1 });
        return [];
      }
    },
    { fallbackData: [] },
  );
}
