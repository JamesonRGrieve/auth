import { useToast } from '@/hooks/useToast';
import log from '@/next-log/log';
import '@/zod2gql';
import z, { GQLType } from '@/zod2gql';
import { getCookie, setCookie } from 'cookies-next';
import { useRouter } from 'next/navigation';
import useSWR, { SWRResponse } from 'swr';
import { chainMutations, createGraphQLClient } from './lib';
import { Team, TeamSchema } from './z';

export const SYSTEM_TEAM_ID = 'FFFFFFFF-FFFF-FFFF-0000-FFFFFFFFFFFF';

/**
 * Hook to fetch and manage team data
 * @returns SWR response containing array of teams
 */
export function useTeams(): SWRResponse<Team[]> {
  const client = createGraphQLClient();
  const { toast } = useToast();
  const router = useRouter();

  return useSWR<Team[]>(
    '/teams',
    async (): Promise<Team[]> => {
      try {
        const query = z.array(TeamSchema).toGQL(GQLType.Query);
        const response = await client.request<{teams:Team[]}>(query);
        const data= response.teams.filter((team)=>team.id !== SYSTEM_TEAM_ID);
        if (response.teams) {
          if (!getCookie('auth-team') || !data.some((team: any) => team.id === getCookie('auth-team'))) {
            setCookie('auth-team', data[0].id, { domain: process.env.NEXT_PUBLIC_COOKIE_DOMAIN });
          }
        }
        return data || [];
      } catch (error) {
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
  if (!id) {
    id = getCookie('auth-team');
  }
  const swrHook = useSWR<Team | null>(
    [`/team?id=${id}`, teams, getCookie('jwt')],
    async (): Promise<Team | null> => {
      if (!getCookie('jwt')) {
        return null;
      }
      try {
        // If an ID is explicitly provided, use that
        if (id) {
          return teams?.find((team) => team.id === id) || null;
        }
      } catch (error) {
        log(['GQL useTeam() Error', error], {
          client: 3,
        });
        return null;
      }
    },
    { fallbackData: null },
  );

  const originalMutate = swrHook.mutate;
  swrHook.mutate = chainMutations(teamsHook, originalMutate);

  return swrHook;
}
