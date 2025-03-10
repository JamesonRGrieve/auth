import { chainMutations } from '@/interactive/hooks/lib';
import log from '@/next-log/log';
import '@/zod2gql/zod2gql';
import { getCookie } from 'cookies-next';
import useSWR, { SWRResponse } from 'swr';
import { useUser } from './useUser';
import { Team } from './z';
/**
 * Transform userTeams to teams array
 * @param user - Current user data
 * @returns Array of teams
 */
const extractTeams = (user: any): Team[] => {
  if (!user || !user.userTeams) return [];

  return user.userTeams.map((userTeam: any) => ({
    id: userTeam.team.id,
    name: userTeam.team.name,
    agents: userTeam.team.agents || [],
    // Include userTeams data from the team
    userTeams: userTeam.team.userTeams || [],
    // Add any additional properties needed for the Team type
  }));
};

/**
 * Hook to fetch and manage team data
 * @returns SWR response containing array of teams
 */
export function useTeams(): SWRResponse<Team[]> {
  const userHook = useUser();
  const { data: user } = userHook;

  const swrHook = useSWR<Team[]>(['/teams', user], () => extractTeams(user), { fallbackData: [] });

  const originalMutate = swrHook.mutate;
  swrHook.mutate = chainMutations(userHook, originalMutate);

  return swrHook;
}

/**
 * Hook to fetch and manage specific team data
 * @param id - Optional team ID to fetch
 * @returns SWR response containing team data or null
 */
export function useTeam(id?: string): SWRResponse<Team | null> {
  const teamsHook = useTeams();
  const { data: teams } = teamsHook;
  if (!id) id = getCookie('auth-team');
  const swrHook = useSWR<Team | null>(
    [`/team?id=${id}`, teams, getCookie('jwt')],
    async (): Promise<Team | null> => {
      if (!getCookie('jwt')) return null;
      try {
        // If an ID is explicitly provided, use that
        if (id) {
          return teams?.find((t) => t.id === id) || null;
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
