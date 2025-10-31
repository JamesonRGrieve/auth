import { DataTable } from '../../../wais/data/data-table';
import { ColumnDef } from '@tanstack/react-table';
import { DataTableColumnHeader } from '../../../wais/data/data-table-column-header';
import { ArrowTopRightIcon } from '@radix-ui/react-icons';
import { Button } from '@/components/ui/button';
import log from '@/lib/next-log/src/log';
import axios from 'axios';
import { getCookie } from 'cookies-next';
import useSWR, { SWRResponse } from 'swr';
import { Invitation } from '../hooks/z';
import { useToast } from '@/hooks/useToast';

export function InvitationsTable({ userId }: { userId?: string }) {
  const { data: invitations, mutate } = useInvitationsByUserId(userId);
  const { toast } = useToast();

  const handleAccept = async (orgObj: Invitation) => {
    try {
      await axios.patch(
        `${process.env.NEXT_PUBLIC_API_URI}/v1/invitation/${orgObj.id}`,
          {
              "invitation": {
                  "invitation_code": orgObj.code,
              }
          },
          {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${getCookie('jwt')}`,
          },
        }
      );
      await mutate();
      toast({
        title: 'Invitation accepted',
        description: 'You have successfully accepted the invitation.',
      })
    } catch (e) {
      toast({
        title: 'Error accepting invitation',
        description: 'There was an error accepting the invitation. Please try again.',
        variant: 'destructive',
      })
    }
  };

  const columns: ColumnDef<Invitation>[] = [
    {
      accessorKey: 'team.name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Team" />,
      cell: ({ row }) => <span>{row.original?.team?.name || '-'}</span>,
    },
    {
      accessorKey: 'code',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Code" />,
      cell: ({ row }) => <span>{row.original.code}</span>,
    },
    {
      accessorKey: 'createdAt',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Created At" />,
      cell: ({ row }) => <span>{new Date(row.original.created_at).toLocaleString()}</span>,
    },
    {
      id: 'actions',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Action" />,
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button
            variant="default"
            size="sm"
            onClick={() => handleAccept(row.original)}
          >
            {'Accept Invitation'}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <DataTable data={invitations} columns={columns} meta={{ title: 'Invitations' }} />
  );
}


export function useInvitationsByUserId(userId?: string): SWRResponse<Invitation[]> {
  return useSWR<Invitation[]>(
    userId ? [`/user/invitation`, userId] : '/user/invitation',
    async (): Promise<Invitation[]> => {
      if (!getCookie('jwt') || !userId) return [];
      try {
        log(['REST useInvitationsByUserId() Fetching', { userId }], {
          client: 1,
        });
        const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URI}/v1/user/invitation`, {
          headers: {
            Authorization: `Bearer ${getCookie('jwt')}`,
          },
          params: { userId },
        });
        log(['REST useInvitationsByUserId() Response', response.data], {
          client: 3,
        });

        const data = convertInvitationsData(response?.data?.invitations || [],userId);


        return data || [];
      } catch (error) {
        log(['REST useInvitationsByUserId() Error', error], {
          client: 3,
        });
        return [];
      }
    },
    { fallbackData: [] },
  );
}


function convertInvitationsData(invitationsData: any[],userId:string) {
  if (invitationsData.length === 0) return [];
  const list: any[] = [];
  invitationsData.forEach((data) => {
    for (let i = 0; i < data.invitees.length; i++) {
      if(data.invitees[i].user_id === userId && data.invitees[i].status === "pending"){
        const inviteeWithTeam = {
          team: data.team,
          role_id: data.role_id,
          role: data.role,
          created_at: data.created_at,
          code: data.code,
          ...data.invitees[i]
        };
        list.push(inviteeWithTeam);
      }
    }
  });
  return list;
}

