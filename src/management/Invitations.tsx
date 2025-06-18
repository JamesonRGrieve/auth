import { DataTable } from '../../../wais/data/data-table';
import { ColumnDef } from '@tanstack/react-table';
import { DataTableColumnHeader } from '../../../wais/data/data-table-column-header';
import { ArrowTopRightIcon } from '@radix-ui/react-icons';
import { Button } from '@/components/ui/button';
import { createGraphQLClient } from '../hooks/lib';
import useSWR, { SWRResponse } from 'swr';
import { Invitation, InvitationSchema } from '../hooks/z';
import log from '@/lib/next-log/src/log';
import axios from 'axios';
import { getCookie } from 'cookies-next';
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
    } catch (e) {
      toast({
        title: 'Error accepting invitation',
        description: 'There was an error accepting the invitation. Please try again.',
        variant: 'destructive',
      })
    } finally {
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
      cell: ({ row }) => <span>{new Date(row.original.createdAt).toLocaleString()}</span>,
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
  const client = createGraphQLClient();

  return useSWR<Invitation[]>(
    userId ? [`/invitations`, userId] : '/invitations',
    async (): Promise<Invitation[]> => {
      if (!userId) {
        return [];
      }
      try {
        const query = InvitationSchema.toGQL('query', 'GetInvitations', { userId
         });
        const response = await client.request<{ invitations: Invitation[] }>(query, { userId });

        if (!response || !response.invitations) {
          return [];
        }

        // Parse and validate the response
        return response.invitations.filter((i) => i?.userId === userId);
      } catch (error) {
        log(['GQL useInvitationsByUserId() Error', error], {
          client: 1,
        });
        return [];
      }
    },
    { fallbackData: [] },
  );
}

