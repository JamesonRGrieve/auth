// SPDX-License-Identifier: AGPL-3.0-or-later
/* eslint-disable react/no-unstable-nested-components -- column cell/header renderers are tanstack render props, not React components. */
import { Button } from '@jgrieve/forms/components/ui/button';
import { useToast } from '@jgrieve/forms/hooks/useToast';
import axios from 'axios';
import { getCookie } from 'cookies-next';
import useSWR, { type SWRResponse } from 'swr';
import { DataTable } from '../components/data/data-table';
import { DataTableColumnHeader } from '../components/data/data-table-column-header';
import type { DataTableColumnDef } from '../components/data/features';
import type { Invitation } from '../hooks/z';
import log from '../lib/log';

export function InvitationsTable({ userId }: { userId?: string }): React.JSX.Element {
  const { data: invitations, mutate } = useInvitationsByUserId(userId);
  const { toast } = useToast() as { toast: (args: { title: string; description: string; variant?: string }) => void };

  const readJwt = (): string => {
    const c = getCookie('jwt');
    return typeof c === 'string' ? c : '';
  };
  const apiBase = (): string => process.env.NEXT_PUBLIC_API_URI ?? '';

  const handleAccept = async (orgObj: DisplayInvitation): Promise<void> => {
    try {
      await axios.patch(
        `${apiBase()}/v1/invitation/${orgObj.id}`,
        {
          invitation: {
            invitation_code: orgObj.code,
          },
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${readJwt()}`,
          },
        },
      );
      await mutate();
      toast({
        title: 'Invitation accepted',
        description: 'You have successfully accepted the invitation.',
      });
    } catch {
      toast({
        title: 'Error accepting invitation',
        description: 'There was an error accepting the invitation. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const columns: DataTableColumnDef<DisplayInvitation>[] = [
    {
      accessorKey: 'team.name',
      header: ({ column }) => <DataTableColumnHeader column={column} title='Team' />,
      cell: ({ row }) => {
        const team = row.original.team;
        return <span>{team?.name ?? '-'}</span>;
      },
    },
    {
      accessorKey: 'code',
      header: ({ column }) => <DataTableColumnHeader column={column} title='Code' />,
      cell: ({ row }) => <span>{row.original.code}</span>,
    },
    {
      accessorKey: 'createdAt',
      header: ({ column }) => <DataTableColumnHeader column={column} title='Created At' />,
      cell: ({ row }) => {
        const createdAt = row.original.created_at ?? row.original.createdAt;
        return <span>{createdAt !== undefined ? new Date(createdAt).toLocaleString() : '-'}</span>;
      },
    },
    {
      id: 'actions',
      header: ({ column }) => <DataTableColumnHeader column={column} title='Action' />,
      cell: ({ row }) => (
        <div className='flex gap-2'>
          <Button variant='default' size='sm' onClick={() => void handleAccept(row.original)}>
            {'Accept Invitation'}
          </Button>
        </div>
      ),
    },
  ];

  return <DataTable data={invitations ?? []} columns={columns} meta={{ title: 'Invitations' }} />;
}

export function useInvitationsByUserId(userId?: string): SWRResponse<DisplayInvitation[]> {
  return useSWR<DisplayInvitation[]>(
    userId !== undefined && userId !== '' ? [`/user/invitation`, userId] : '/user/invitation',
    async (): Promise<DisplayInvitation[]> => {
      const jwt = getCookie('jwt');
      if (jwt === undefined || jwt === '' || userId === undefined || userId === '') {
        return [];
      }
      try {
        log(['REST useInvitationsByUserId() Fetching', { userId }], {
          client: 1,
        });
        const jwtString = typeof jwt === 'string' ? jwt : '';
        const apiBase = process.env.NEXT_PUBLIC_API_URI ?? '';
        const response = await axios.get<{ invitations?: RawInvitationGroup[] }>(`${apiBase}/v1/user/invitation`, {
          headers: {
            Authorization: `Bearer ${jwtString}`,
          },
          params: { userId },
        });
        log(['REST useInvitationsByUserId() Response', response.data], {
          client: 3,
        });

        return convertInvitationsData(response.data.invitations ?? [], userId);
      } catch (error: unknown) {
        log(['REST useInvitationsByUserId() Error', error], {
          client: 3,
        });
        return [];
      }
    },
    { fallbackData: [] },
  );
}

/**
 * The shape that actually flows from the API into the table. The upstream
 * payload mixes the canonical {@link Invitation} fields (camelCase) with the
 * raw snake_case fields the renderers read (`team`, `created_at`). Modelling
 * both keeps the column renderers type-safe without an `as Invitation` cast.
 */
type DisplayInvitation = Partial<Invitation> & {
  team?: { name?: string } | null | undefined;
  role_id?: string | null | undefined;
  role?: string | null | undefined;
  created_at?: string | undefined;
  user_id?: string;
  status?: string;
} & Record<string, unknown>;

type RawInvitee = { user_id: string; status: string } & Record<string, unknown>;
type RawInvitationGroup = {
  team?: { name?: string } | null;
  role_id?: string | null;
  role?: string | null;
  created_at?: string;
  code?: string | null;
  invitees: RawInvitee[];
};

function convertInvitationsData(invitationsData: RawInvitationGroup[], userId: string): DisplayInvitation[] {
  if (invitationsData.length === 0) {
    return [];
  }
  const list: DisplayInvitation[] = [];
  invitationsData.forEach((data) => {
    for (const invitee of data.invitees) {
      if (invitee.user_id === userId && invitee.status === 'pending') {
        const inviteeWithTeam: DisplayInvitation = {
          team: data.team,
          role_id: data.role_id,
          role: data.role,
          created_at: data.created_at,
          code: data.code,
          ...invitee,
        };
        list.push(inviteeWithTeam);
      }
    }
  });
  return list;
}
/* eslint-enable react/no-unstable-nested-components */
