// SPDX-License-Identifier: AGPL-3.0-or-later
import { getCookie, setCookie } from 'cookies-next/client';
import useSWR, { type SWRResponse } from 'swr';
import { z } from 'zod';
import { GQLType, toGQL } from 'zod2gql';
import log from '../lib/log';
import { cookieDomainOptions } from '../utils';
import { chainMutations, createGraphQLClient } from './lib';
import { type Team, TeamSchema } from './z';

export const SYSTEM_TEAM_ID = 'FFFFFFFF-FFFF-FFFF-0000-FFFFFFFFFFFF';

/**
 * Hook to fetch and manage team data
 * @returns SWR response containing array of teams
 */
export function useTeams(): SWRResponse<Team[]> {
  const client = createGraphQLClient();

  return useSWR<Team[]>(
    '/teams',
    async (): Promise<Team[]> => {
      try {
        const query = toGQL(z.array(TeamSchema), GQLType.Query);
        const response = await client.request<{ teams: Team[] }>(query);
        const data = response.teams.filter((team) => team.id !== SYSTEM_TEAM_ID);
        const authTeam = getCookie('auth-team');
        if (authTeam === undefined || authTeam === '' || !data.some((team: Team) => team.id === authTeam)) {
          setCookie('auth-team', data[0]?.id ?? '', cookieDomainOptions());
        }
        return data;
      } catch (error: unknown) {
        log(['GQL useTeams() Error', error], {
          client: 1,
        });
        return [];
      }
    },
    { fallbackData: [] },
  );
}

/**
 * Hook to fetch and manage specific team data
 * @param id - Optional team ID to fetch
 * @returns SWR response containing team data or null
 */
export function useTeam(id?: string): SWRResponse<Team | null> {
  const teamsHook = useTeams();
  const { data: teams } = teamsHook;
  const resolvedId = id === undefined || id === '' ? getCookie('auth-team') : id;
  const swrHook = useSWR<Team | null>(
    [`/team?id=${resolvedId}`, teams, getCookie('jwt')],
    (): Team | null => {
      const jwt = getCookie('jwt');
      if (jwt === undefined || jwt === '') {
        return null;
      }
      try {
        // If an ID is explicitly provided, use that
        if (resolvedId !== undefined && resolvedId !== '') {
          return teams?.find((team) => team.id === resolvedId) ?? null;
        }
      } catch (error: unknown) {
        log(['GQL useTeam() Error', error], {
          client: 3,
        });
        return null;
      }
      return null;
    },
    { fallbackData: null },
  );

  const originalMutate = swrHook.mutate;
  swrHook.mutate = chainMutations(teamsHook, originalMutate);

  return swrHook;
}
