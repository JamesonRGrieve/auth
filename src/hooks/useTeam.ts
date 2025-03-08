import { chainMutations } from '@/interactive/hooks/lib';
import log from '@/next-log/log';
import '@/zod2gql/zod2gql';
import axios from 'axios';
import { getCookie } from 'cookies-next';
import useSWR, { SWRResponse } from 'swr';
import { useUser } from './useUser';
import { Team } from './z';
/**
 * Hook to fetch and manage company data
 * @returns SWR response containing array of companies
 */
export function useTeams(): SWRResponse<Team[]> {
  const userHook = useUser();
  const { data: user } = userHook;

  const swrHook = useSWR<Team[]>(['/teams', user], () => user?.teams || [], { fallbackData: [] });

  const originalMutate = swrHook.mutate;
  swrHook.mutate = chainMutations(userHook, originalMutate);

  return swrHook;
}

/**
 * Hook to fetch and manage specific company data
 * @param id - Optional company ID to fetch
 * @returns SWR response containing company data or null
 */
export function useTeam(id?: string): SWRResponse<Team | null> {
  const companiesHook = useTeams();
  const { data: companies } = companiesHook;
  console.log('COMPANY THING');
  const swrHook = useSWR<Team | null>(
    [`/company?id=${id}`, companies, getCookie('jwt')],
    async (): Promise<Team | null> => {
      if (!getCookie('jwt')) return null;
      try {
        if (id) {
          return companies?.find((c) => c.id === id) || null;
        } else {
          log(['GQL useTeam() Teams', companies], {
            client: 1,
          });
          const agentName = getCookie('aginteractive-agent');
          log(['GQL useTeam() AgentName', agentName], {
            client: 1,
          });
          const targetTeam =
            companies?.find((c) => (agentName ? c.agents.some((a) => a.name === agentName) : c.primary)) || null;
          log(['GQL useTeam() Team', targetTeam], {
            client: 1,
          });
          if (!targetTeam) return null;
          targetTeam.extensions = (
            await axios.get(
              `${process.env.NEXT_PUBLIC_API_URI}/v1/teams/${targetTeam.id}/extensions`,

              {
                headers: {
                  Authorization: getCookie('jwt'),
                },
              },
            )
          ).data.extensions;
          log(['GQL useTeam() Team With Extensions', targetTeam], {
            client: 3,
          });
          return targetTeam;
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
  swrHook.mutate = chainMutations(companiesHook, originalMutate);

  return swrHook;
}
