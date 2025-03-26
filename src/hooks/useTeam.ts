import { useToast } from '@/hooks/useToast';
import { chainMutations, createGraphQLClient } from '@/interactive/hooks/lib';
import { useInteractiveConfig } from '@/interactive/InteractiveConfigContext';
import log from '@/next-log/log';
import '@/zod2gql/zod2gql';
import { getCookie, setCookie } from 'cookies-next';
import { useRouter } from 'next/navigation';
import useSWR, { SWRResponse } from 'swr';
import { Team, TeamSchema } from './z';
/**
 * Hook to fetch and manage team data
 * @returns SWR response containing array of teams
 */
export function useTeams(): SWRResponse<Team[]> {
  const client = createGraphQLClient();
  const { toast } = useToast();
  const { sdk: sdk } = useInteractiveConfig();
  const router = useRouter();

  return useSWR<Team[]>(
    '/teams',
    async (): Promise<Team[]> => {
      try {
        const query = TeamSchema.toGQL('query', 'GetTeams');
        const response = await client.request(query);
        if (response.teams) {
          if (!getCookie('auth-team') || !response.teams.some((team: any) => team.id === getCookie('auth-team'))) {
            setCookie('auth-team', response.teams[0].id, { domain: process.env.NEXT_PUBLIC_COOKIE_DOMAIN });
          }
        }
        return response.teams || [];
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
