'use client';
// SPDX-License-Identifier: AGPL-3.0-or-later
/* eslint-disable react/no-unstable-nested-components -- column cell renderers close over component state; canonical tanstack pattern. */
import { Button } from '@jgrieve/forms/components/ui/button';
import { Input } from '@jgrieve/forms/components/ui/input';
import { Label } from '@jgrieve/forms/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@jgrieve/forms/components/ui/select';
import { useToast as useToastUntyped } from '@jgrieve/forms/hooks/useToast';
import axios from 'axios';
import { getCookie } from 'cookies-next';
import { Mail, MoreHorizontal } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useState, type ChangeEvent } from 'react';
import { DataTable } from '../components/data/data-table';
import { DataTableColumnHeader } from '../components/data/data-table-column-header';
import type { DataTableColumnDef } from '../components/data/features';
import { Badge } from '../components/ui/badge';
import { Checkbox } from '../components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { useInvitations } from '../hooks/useInvitation';
import { useTeam } from '../hooks/useTeam';
import useTeamUsers from '../hooks/useTeamUsers';
import { useUser } from '../hooks/useUser';
import log from '../lib/log';

type ToastFn = (args: { title: string; description: string; variant?: string }) => void;
const useToast = useToastUntyped as () => { toast: ToastFn };

interface User {
  email: string;
  first_name: string;
  id: string;
  last_name: string;
  role: string;
  role_id: number;
  user_id?: string;
  user?: { first_name?: string; last_name?: string; email?: string };
}

const ROLES = [
  { id: 'FFFFFFFF-FFFF-FFFF-AAAA-FFFFFFFFFFFF', name: 'Admin' },
  { id: 'FFFFFFFF-FFFF-FFFF-0000-FFFFFFFFFFFF', name: 'User' },
];

const _AUTHORIZED_ROLES = [0, 1, 2];

type ApiError = { response?: { data?: { detail?: string } } };

const readJwtString = (): string => {
  const jwt = getCookie('jwt');
  return typeof jwt === 'string' ? jwt : '';
};

const apiUri = (): string => process.env.NEXT_PUBLIC_API_URI ?? '';
const appUri = (): string => process.env.NEXT_PUBLIC_APP_URI ?? '';

export interface Invitee {
  invitation_id?: string | undefined;
  invitation?: Record<string, unknown> | null | undefined;
  user_id?: string | null | undefined;
  user?: Record<string, unknown> | null | undefined;
  updated_at: string;
  updated_by_user_id: string | null;
  id: string;
  created_at: string;
  created_by_user_id: string;
  email: string;
  declined_at: string | null;
  accepted_at: string | null;
  status?: 'pending' | 'accepted' | undefined;
  role_id: string;
  team?: { name?: string } | null | undefined;
  team_id: string;
  code: string;
}

export interface Invitation {
  role_id: string;
  role: Record<string, unknown> | null;
  team_id: string;
  team: { name?: string } | null;
  user_id: string | null;
  user: Record<string, unknown> | null;
  updated_at: string;
  updated_by_user_id: string | null;
  id: string;
  created_at: string;
  created_by_user_id: string;
  code: string;
  max_uses: number | null;
  expires_at: string | null;
  invitees: Invitee[];
}

export const Team = (): React.JSX.Element => {
  const [_email, _setEmail] = useState('');
  const [_roleId, _setRoleId] = useState('3');
  const [_renaming, _setRenaming] = useState(false);
  const [_creating, _setCreating] = useState(false);
  const [_newParent, _setNewParent] = useState('');
  const [_newName, _setNewName] = useState('');

  const params = useParams();
  const { id } = params;

  const rawAuthTeam = id ?? getCookie('auth-team');
  const authTeam = typeof rawAuthTeam === 'string' ? rawAuthTeam : Array.isArray(rawAuthTeam) ? (rawAuthTeam[0] ?? '') : '';
  const teamIdString = typeof id === 'string' ? id : Array.isArray(id) ? (id[0] ?? '') : '';
  const { data: user } = useUser() as { data?: { id?: string } };
  const { data: activeTeam, mutate: _mutate } = useTeam(teamIdString) as {
    data?: { id?: string; name?: string };
    mutate: () => void;
  };
  const { data: userData } = useUser() as { data?: { id?: string } };
  const { data: invitationsList, mutate: mutateInvitations } = useInvitations(authTeam) as unknown as {
    data?: Invitation[];
    mutate: () => Promise<unknown>;
  };
  const invitationsData = invitationsList?.filter((invitation) => invitation.created_by_user_id === userData?.id) ?? [];
  const [_responseMessage, _setResponseMessage] = useState('');
  const { data: users, mutate: teamUsersMutate } = useTeamUsers(authTeam) as unknown as {
    data?: User[];
    mutate: () => Promise<unknown>;
  };
  const { toast } = useToast();
  const router = useRouter();

  const inviteesArray = convertInvitationsData(invitationsData);

  function convertInvitationsData(rows: Invitation[]): Invitee[] {
    if (rows.length === 0) {
      return [];
    }
    const list: Invitee[] = [];
    for (const data of rows) {
      if (!Array.isArray(data.invitees)) {
        continue;
      }
      for (let i = 0; i < data.invitees.length; i++) {
        const newInvitee: Invitee = {
          ...data.invitees[i],
          role_id: data.role_id,
          team: data.team,
          team_id: data.team_id,
          code: data.code,
        };
        list.push(newInvitee);
      }
    }
    return list;
  }

  const usersColumns: DataTableColumnDef<User>[] = [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate')}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(value !== false)}
          aria-label='Select all'
          className='translate-y-[2px]'
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(value !== false)}
          aria-label='Select row'
          className='translate-y-[2px]'
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'firstName',
      header: ({ column }) => <DataTableColumnHeader column={column} title='First Name' />,
      cell: ({ row }) => {
        return (
          <div className='flex space-x-2'>
            <span className='max-w-[500px] truncate font-medium'>{row.original.user?.first_name ?? '-'}</span>
          </div>
        );
      },
      meta: {
        headerName: 'First Name',
      },
    },
    {
      accessorKey: 'lastName',
      header: ({ column }) => <DataTableColumnHeader column={column} title='Last Name' />,
      cell: ({ row }) => {
        return (
          <div className='flex w-[100px] items-center'>
            <span>{row.original.user?.last_name ?? '-'}</span>
          </div>
        );
      },
      filterFn: (row, columnId, value: string[]) => {
        return value.includes(row.getValue(columnId));
      },
      meta: {
        headerName: 'Last Name',
      },
    },
    {
      accessorKey: 'email',
      header: ({ column }) => <DataTableColumnHeader column={column} title='Email' />,
      cell: ({ row }) => {
        return (
          <div className='flex items-center'>
            <span className='truncate'>{row.original.user?.email}</span>
          </div>
        );
      },
      meta: {
        headerName: 'Email',
      },
    },
    // {
    //   accessorKey: 'role',
    //   header: ({ column }) => <DataTableColumnHeader column={column} title='Role' />,
    //   cell: ({ row }) => {
    //     const role = row.getValue('role');
    //     return (
    //       <div className='flex items-center'>
    //         <Badge variant='outline' className='capitalize'>
    //           {role.replace('_', ' ')}
    //         </Badge>
    //       </div>
    //     );
    //   },
    //   meta: {
    //     headerName: 'Role',
    //   },
    // },
    {
      id: 'actions',
      cell: ({ row }) => {
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant='ghost' className='flex h-8 w-8 p-0 data-[state=open]:bg-muted'>
                <MoreHorizontal className='w-4 h-4' />
                <span className='sr-only'>Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end' className='w-[160px]'>
              <DropdownMenuLabel>User Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {/* <DropdownMenuItem onClick={(e) => e.preventDefault()} className='p-0'>
                <Button variant='ghost' className='justify-start w-full'>
                  Edit User
                </Button>
              </DropdownMenuItem> */}
              <DropdownMenuItem onSelect={() => router.push(`/users/${row.original.id}`)}>View Details</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  void (async (): Promise<void> => {
                    if (user?.id === row.original.user_id) {
                      toast({
                        title: 'Action not allowed',
                        description: 'You cannot delete yourself from the team.',
                        variant: 'destructive',
                      });
                      return;
                    }
                    try {
                      await axios.delete(`${apiUri()}/v1/user_team/${row.original.id}`, {
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${readJwtString()}`,
                        },
                      });
                      toast({
                        title: 'User deleted',
                        description: 'The user has been removed from the team.',
                      });
                      void teamUsersMutate();
                    } catch {
                      toast({
                        title: 'Error deleting user',
                        description: 'Failed to remove the user from the team.',
                        variant: 'destructive',
                      });
                    }
                  })();
                }}
                className='p-0'
              >
                <Button variant='ghost' className='justify-start w-full text-red-600 hover:text-red-600'>
                  Delete User
                </Button>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
      enableHiding: true,
      enableSorting: false,
      meta: {
        headerName: 'Actions',
      },
    },
  ];
  const invitationsColumns: DataTableColumnDef<Invitee>[] = [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate')}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(value !== false)}
          aria-label='Select all'
          className='translate-y-[2px]'
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(value !== false)}
          aria-label='Select row'
          className='translate-y-[2px]'
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'email',
      header: ({ column }) => <DataTableColumnHeader column={column} title='Email' />,
      cell: ({ row }) => {
        return (
          <div className='flex items-center space-x-2'>
            <Mail className='w-4 h-4 text-muted-foreground' />
            <span className='font-medium'>{row.original.email !== '' ? row.original.email : ''}</span>
          </div>
        );
      },
      meta: {
        headerName: 'Email',
      },
    },
    {
      accessorKey: 'roleId',
      header: ({ column }) => <DataTableColumnHeader column={column} title='Role' />,
      cell: ({ row }) => {
        const roleMap = {
          1: 'Root Admin',
          'FFFFFFFF-0000-0000-AAAA-FFFFFFFFFFFF': 'Admin',
          'FFFFFFFF-0000-0000-0000-FFFFFFFFFFFF': 'User',
        };
        return (
          <div className='flex w-[100px] items-center'>
            <span>{roleMap[row.original.role_id as keyof typeof roleMap]}</span>
          </div>
        );
      },
      filterFn: (row, columnId, value: string[]) => {
        return value.includes(row.getValue(columnId));
      },
      meta: {
        headerName: 'Role',
      },
    },
    {
      accessorKey: 'status',
      header: ({ column }) => <DataTableColumnHeader column={column} title='Status' />,
      cell: ({ row }) => {
        const status = row.original.status;
        return (
          <div className='flex w-[100px] items-center'>
            <Badge variant={status === 'accepted' ? 'default' : 'secondary'}>
              {/* {status ? <Check className='w-3 h-3 mr-1' /> : <X className='w-3 h-3 mr-1' />} */}
              {String(status)}
            </Badge>
          </div>
        );
      },
      meta: {
        headerName: 'Status',
      },
    },
    {
      accessorKey: 'created_at',
      header: ({ column }) => <DataTableColumnHeader column={column} title='Sent Date' />,
      cell: ({ row }) => {
        const date = new Date(row.getValue('created_at'));
        const formattedDate = date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        });
        return (
          <div className='flex items-center'>
            <span>{formattedDate}</span>
          </div>
        );
      },
      meta: {
        headerName: 'Sent Date',
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const copyInviteLink = (invitation: Invitee): void => {
          const link = `${appUri()}/accept-invitation?code=${invitation.code ?? ''}&email=${invitation.email}&team=${invitation.team?.name ?? activeTeam?.name ?? ''}`;
          void navigator.clipboard.writeText(link);
          toast({
            title: 'Link copied',
            description: 'The invitation link has been copied to your clipboard.',
          });
        };

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant='ghost' className='flex h-8 w-8 p-0 data-[state=open]:bg-muted'>
                <MoreHorizontal className='w-4 h-4' />
                <span className='sr-only'>Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end' className='w-[160px]'>
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => copyInviteLink(row.original)}>Copy Invite Link</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => router.push(`/invitation/${row.original.id}`)}>
                View Details
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className='text-destructive'
                onClick={() => {
                  void (async (): Promise<void> => {
                    if (row.original.status !== 'pending') {
                      toast({
                        title: 'Error Cancelling Invitation',
                        description: 'Only pending invitations can be cancelled.',
                        variant: 'destructive',
                      });
                      return;
                    }
                    try {
                      await axios.delete(`${apiUri()}/v1/invitation/${row.original.invitation_id}`, {
                        headers: {
                          Authorization: `Bearer ${readJwtString()}`,
                        },
                      });
                      toast({
                        title: 'Invitation Cancelled',
                        description: 'The invitation has been cancelled.',
                      });
                      void mutateInvitations();
                    } catch (error: unknown) {
                      const err = error as ApiError;
                      toast({
                        title: 'Error Cancelling Invitation',
                        description: err.response?.data?.detail ?? 'There was an error cancelling the invitation.',
                        variant: 'destructive',
                      });
                    }
                  })();
                }}
              >
                Cancel Invitation
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
      enableHiding: false,
      enableSorting: false,
      meta: {
        headerName: 'Actions',
      },
    },
  ];

  log(['Invitations Data', invitationsData], { client: 3 });

  return (
    <div className='space-y-10'>
      <DataTable data={users ?? []} columns={usersColumns} meta={{ title: 'Current Users' }} />
      {invitationsData.length === 0 ? (
        <div>
          <h4 className='text-2xl font-bold mr-auto mb-4'>Pending Invitations</h4>
          <div className='flex items-center justify-center p-4 border rounded-md text-center'>
            <span className='text-sm text-muted-foreground'>No pending invitations.</span>
          </div>
        </div>
      ) : (
        invitationsData.length > 0 && (
          <DataTable data={inviteesArray} columns={invitationsColumns} meta={{ title: 'Pending Invitations' }} />
        )
      )}
    </div>
  );
};

export function InviteUsers(): React.JSX.Element {
  const [email, setEmail] = useState('');
  const [roleId, setRoleId] = useState('3');
  const [_responseMessage, setResponseMessage] = useState('');
  const { data: activeTeam } = useTeam() as { data?: { id?: string; name?: string } };
  const { mutate: mutateInvitations } = useInvitations(activeTeam?.id) as { mutate: () => Promise<unknown> };
  const { toast } = useToast();

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    if (email === '') {
      setResponseMessage('Please enter an email to invite.');
      return;
    }

    try {
      const response = await axios.post<{ id?: string }>(
        `${apiUri()}/v1/invitation`,
        {
          invitation: {
            email: email,
            role_id: roleId,
            team_id: activeTeam?.id,
          },
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${readJwtString()}`,
          },
        },
      );

      void mutateInvitations();

      if (response.status === 200) {
        toast({
          title: 'Invitation sent',
          description: 'The invitation has been sent successfully.',
        });
        if (response.data.id !== undefined && response.data.id !== '') {
          setResponseMessage(
            `Invitation sent successfully! The invite link is ${appUri()}/?invitation_id=${response.data.id}&email=${email}`,
          );
        } else {
          setResponseMessage('Invitation sent successfully!');
        }
        setEmail('');
      }
    } catch (error: unknown) {
      const err = error as ApiError;
      const message = err.response?.data?.detail ?? 'Failed to send invitation';
      toast({
        title: 'Error sending invitation',
        description: message,
        variant: 'destructive',
      });
      setResponseMessage(message);
    }
  };

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className='space-y-4'>
      <h4 className='font-medium text-md'>Invite Users to {activeTeam?.name}</h4>
      <div className='space-y-2'>
        <Label htmlFor='email'>Email Address</Label>
        <Input
          id='email'
          type='email'
          placeholder='user@example.com'
          value={email}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
          className='w-full'
        />
      </div>

      <div className='space-y-2'>
        <Label htmlFor='role'>Role</Label>
        <Select value={roleId} onValueChange={setRoleId}>
          <SelectTrigger className='w-full'>
            <SelectValue placeholder='Select a role' />
          </SelectTrigger>
          <SelectContent>
            {ROLES.map((role) => (
              <SelectItem key={role.id} value={role.id.toString()}>
                {role.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button type='submit' className='w-full' disabled={email === ''}>
        Send Invitation
      </Button>
    </form>
  );
}
/* eslint-enable react/no-unstable-nested-components */
