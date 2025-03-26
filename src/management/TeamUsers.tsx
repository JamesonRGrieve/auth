'use client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import log from '@/next-log/log';
import { ColumnDef } from '@tanstack/react-table';
import axios from 'axios';
import { getCookie } from 'cookies-next';
import { Check, Mail, MoreHorizontal, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useToast } from '@/hooks/useToast';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { DataTable } from '@/components/jrg/wais/data/data-table';
import { DataTableColumnHeader } from '@/components/jrg/wais/data/data-table-column-header';
import { useInvitations } from '../hooks/useInvitation';
import { useTeam, useTeams } from '../hooks/useTeam';

interface User {
  email: string;
  first_name: string;
  id: string;
  last_name: string;
  role: string;
  role_id: number;
}

const ROLES = [
  { id: 'FFFFFFFF-FFFF-FFFF-AAAA-FFFFFFFFFFFF', name: 'Admin' },
  { id: 'FFFFFFFF-FFFF-FFFF-0000-FFFFFFFFFFFF', name: 'User' },
];

const AUTHORIZED_ROLES = [0, 1, 2];
interface Invitation {
  id: string;
  team_id: string;
  email: string;
  inviter_id: string;
  role_id: number;
  is_accepted: boolean;
  createdAt: string;
  invitation_link: string;
}

export const Team = () => {
  const [email, setEmail] = useState('');
  const [roleId, setRoleId] = useState('3');
  const [renaming, setRenaming] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newParent, setNewParent] = useState('');
  const [newName, setNewName] = useState('');

  const { data: teamData } = useTeams();
  const { data: activeTeam, mutate } = useTeam();
  const { data: invitationsData, mutate: mutateInvitations } = useInvitations(activeTeam?.id);
  const [responseMessage, setResponseMessage] = useState('');
  const users = activeTeam && teamData.find((c) => c.id === activeTeam.id)?.userTeams.map((u) => u.user);
  const { toast } = useToast();
  const users_columns: ColumnDef<User>[] = [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate')}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label='Select all'
          className='translate-y-[2px]'
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
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
            <span className='max-w-[500px] truncate font-medium'>{row.getValue('firstName')}</span>
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
            <span>{row.getValue('lastName')}</span>
          </div>
        );
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
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
            <span className='truncate'>{row.getValue('email')}</span>
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
        const router = useRouter();

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
                onClick={async (e) => {
                  try {
                    await axios.delete(
                      `${process.env.NEXT_PUBLIC_API_URI}/v1/companies/${activeTeam?.id}/users/${row.original.id}`,
                      {
                        headers: {
                          'Content-Type': 'application/json',
                          Authorization: getCookie('jwt'),
                        },
                      },
                    );
                    toast({
                      title: 'User deleted',
                      description: 'The user has been removed from the team.',
                    });
                    mutate();
                  } catch (error) {
                    toast({
                      title: 'Error deleting user',
                      description: 'Failed to remove the user from the team.',
                      variant: 'destructive',
                    });
                  }
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
  const invitations_columns: ColumnDef<Invitation>[] = [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate')}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label='Select all'
          className='translate-y-[2px]'
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
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
            <span className='font-medium'>{row.getValue('email')}</span>
          </div>
        );
      },
      meta: {
        headerName: 'Email',
      },
    },
    {
      accessorKey: 'role_id',
      header: ({ column }) => <DataTableColumnHeader column={column} title='Role' />,
      cell: ({ row }) => {
        const roleMap = {
          1: 'Root Admin',
          2: 'Team Admin',
          3: 'User',
        };
        return (
          <div className='flex w-[100px] items-center'>
            <span>{roleMap[row.getValue('role_id') as keyof typeof roleMap]}</span>
          </div>
        );
      },
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
      meta: {
        headerName: 'Role',
      },
    },
    {
      accessorKey: 'is_accepted',
      header: ({ column }) => <DataTableColumnHeader column={column} title='Status' />,
      cell: ({ row }) => {
        const isAccepted = row.getValue('is_accepted');
        return (
          <div className='flex w-[100px] items-center'>
            <Badge variant={isAccepted ? 'default' : 'secondary'}>
              {isAccepted ? <Check className='w-3 h-3 mr-1' /> : <X className='w-3 h-3 mr-1' />}
              {isAccepted ? 'Accepted' : 'Pending'}
            </Badge>
          </div>
        );
      },
      meta: {
        headerName: 'Status',
      },
    },
    {
      accessorKey: 'createdAt',
      header: ({ column }) => <DataTableColumnHeader column={column} title='Sent Date' />,
      cell: ({ row }) => {
        const date = new Date(row.getValue('createdAt'));
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
        const router = useRouter();

        const copyInviteLink = (link: string) => {
          navigator.clipboard.writeText(link);
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
              <DropdownMenuItem onClick={() => copyInviteLink(row.original.invitation_link)}>
                Copy Invite Link
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => router.push(`/invitation/${row.original.id}`)}>
                View Details
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className='text-destructive'
                onClick={async () => {
                  await axios.delete(`${process.env.NEXT_PUBLIC_API_URI}/v1/invitation/${row.original.id}`, {
                    headers: {
                      Authorization: getCookie('jwt'),
                    },
                  });
                  mutateInvitations();
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
    <div className='space-y-6'>
      <h4 className='font-medium text-md'>{activeTeam?.name} Current Users</h4>
      <DataTable data={users || []} columns={users_columns} />
      <InviteUsers />
      {invitationsData.length > 0 && (
        <>
          <h4 className='font-medium text-md'>Pending Invitations</h4>
          <DataTable data={invitationsData || []} columns={invitations_columns} />
        </>
      )}
    </div>
  );
};

export function InviteUsers() {
  const [email, setEmail] = useState('');
  const [roleId, setRoleId] = useState('3');
  const [responseMessage, setResponseMessage] = useState('');
  const { data: activeTeam } = useTeam();
  const { mutate: mutateInvitations } = useInvitations(activeTeam?.id);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email) {
      setResponseMessage('Please enter an email to invite.');
      return;
    }

    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URI}/v1/invitation`,
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
            Authorization: getCookie('jwt'),
          },
        },
      );

      mutateInvitations();

      if (response.status === 200) {
        toast({
          title: 'Invitation sent',
          description: 'The invitation has been sent successfully.',
        });
        if (response.data?.id) {
          setResponseMessage(
            `Invitation sent successfully! The invite link is ${process.env.NEXT_PUBLIC_APP_URI}/?invitation_id=${response.data.id}&email=${email}`,
          );
        } else {
          setResponseMessage('Invitation sent successfully!');
        }
        setEmail('');
      }
    } catch (error) {
      toast({
        title: 'Error sending invitation',
        description: error.response?.data?.detail || 'Failed to send invitation',
        variant: 'destructive',
      });
      setResponseMessage(error.response?.data?.detail || 'Failed to send invitation');
    }
  };

  return (
    <form onSubmit={handleSubmit} className='space-y-4'>
      <h4 className='font-medium text-md'>Invite Users to {activeTeam?.name}</h4>
      <div className='space-y-2'>
        <Label htmlFor='email'>Email Address</Label>
        <Input
          id='email'
          type='email'
          placeholder='user@example.com'
          value={email}
          onChange={(e) => setEmail(e.target.value)}
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

      <Button type='submit' className='w-full' disabled={!email}>
        Send Invitation
      </Button>
    </form>
  );
}

export default Team;
