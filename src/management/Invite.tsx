'use client';
// SPDX-License-Identifier: AGPL-3.0-or-later

import { Button } from '@jgrieve/forms/components/ui/button';
import { Input } from '@jgrieve/forms/components/ui/input';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@jgrieve/forms/components/ui/select';
import { useToast } from '@jgrieve/forms/hooks/useToast';
import axios from 'axios';
import { getCookie } from 'cookies-next';
import { useParams } from 'next/navigation.js';
import { useCallback, useEffect, useState } from 'react';
import { LuUsers } from 'react-icons/lu';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { SidebarMenuButton, SidebarMenuItem } from '../components/ui/sidebar';
import { useInvitations } from '../hooks/useInvitation';

const ROLES = [
  { id: 'FFFFFFFF-0000-0000-AAAA-FFFFFFFFFFFF', name: 'Admin' },
  { id: 'FFFFFFFF-0000-0000-0000-FFFFFFFFFFFF', name: 'User' },
];

interface Role {
  id: number;
  name: string;
  parent_id?: number;
}

interface RoleWithChildren extends Role {
  children: RoleWithChildren[];
  depth: number;
}

type ApiError = { response?: { data?: { detail?: string } } };

const readJwtString = (): string => {
  const jwt = getCookie('jwt');
  return typeof jwt === 'string' ? jwt : '';
};

const apiUri = (): string => process.env.NEXT_PUBLIC_API_URI ?? '';

function sortRolesByPermission(roles: Role[]): Role[] {
  const roleMap = new Map<number, RoleWithChildren>();
  roles.forEach((role: Role) => {
    roleMap.set(role.id, { ...role, children: [], depth: -1 });
  });

  roleMap.forEach((role: RoleWithChildren) => {
    if (role.parent_id !== undefined && roleMap.has(role.parent_id)) {
      const parent = roleMap.get(role.parent_id);
      if (parent !== undefined) {
        parent.children.push(role);
      }
    }
  });

  function assignDepth(role: RoleWithChildren, depth: number): void {
    role.depth = depth;
    role.children.forEach((child: RoleWithChildren) => {
      assignDepth(child, depth + 1);
    });
  }

  roleMap.forEach((role: RoleWithChildren) => {
    if (role.parent_id === undefined) {
      assignDepth(role, 0);
    }
  });

  const sortedRoles = Array.from(roleMap.values()).sort((a, b) => a.depth - b.depth);

  return sortedRoles.map(({ children: _children, depth: _depth, ...role }) => role);
}

export const InviteDialog = ({
  selectedTeam,
}: {
  selectedTeam: { id: string; name?: string } | null;
}): React.JSX.Element => {
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [roleId, setRoleId] = useState(ROLES[1]?.id ?? '');
  const [roles, setRoles] = useState(ROLES);
  const { toast } = useToast() as { toast: (args: { title: string; description: string; variant?: string }) => void };

  const params = useParams();
  const { id } = params;
  const rawAuthTeam = id ?? getCookie('auth-team');
  const authTeam = typeof rawAuthTeam === 'string' ? rawAuthTeam : Array.isArray(rawAuthTeam) ? (rawAuthTeam[0] ?? '') : '';
  const { mutate: inviteMutate } = useInvitations(authTeam);

  const fetchRoles = useCallback(async (): Promise<{ roles: Role[] }> => {
    if (selectedTeam === null) {
      return { roles: [] };
    }
    const response = await axios.get<{ roles: Role[] }>(`${apiUri()}/v1/team/${selectedTeam.id}/role`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${readJwtString()}`,
      },
      validateStatus: (status) => [200, 403].includes(status),
    });
    return response.data;
  }, [selectedTeam]);

  useEffect(() => {
    if (selectedTeam !== null) {
      void (async (): Promise<void> => {
        try {
          const data = await fetchRoles();
          const sortedRoles = sortRolesByPermission(data.roles);
          setRoles([...ROLES, ...sortedRoles.map((r) => ({ id: String(r.id), name: r.name }))]);
        } catch {
          setRoles(ROLES);
        }
      })();
    }
  }, [selectedTeam, fetchRoles]);

  const handleSubmit = async (e: React.SyntheticEvent): Promise<void> => {
    e.preventDefault();

    if (email === '') {
      toast({
        title: 'Error',
        description: 'Please enter an email to invite.',
        variant: 'destructive',
      });
      return;
    }
    if (selectedTeam === null) {
      return;
    }

    const emailArray = email.split(',').filter((emailStr) => emailStr.trim() !== '');
    if (emailArray.length === 0 || emailArray.length > 10) {
      toast({
        title: 'Error',
        description: emailArray.length === 0 ? 'Please enter an email to invite.' : 'You can only enter up to 10 emails.',
        variant: 'destructive',
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    const invalidEmails = emailArray.filter((emailStr) => !emailRegex.test(emailStr.trim()));

    if (invalidEmails.length > 0) {
      toast({
        title: 'Error',
        description: `Invalid emails found: ${invalidEmails.join(', ')}`,
        variant: 'destructive',
      });
      return;
    }
    let body: Record<string, unknown>;
    if (emailArray.length === 1) {
      body = {
        invitation: {
          email: (emailArray[0] ?? '').trim(),
          role_id: roleId,
          team_id: selectedTeam.id,
        },
      };
    } else {
      body = {
        invitations: emailArray.map((emailStr) => ({
          email: emailStr.trim(),
          role_id: roleId,
          team_id: selectedTeam.id,
        })),
      };
    }

    try {
      const response = await axios.post(`${apiUri()}/v1/invitation`, body, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${readJwtString()}`,
        },
      });

      if (response.status === 201) {
        toast({
          title: 'Success',
          description: 'Invitation sent successfully!',
        });
        setEmail('');
        setIsInviteDialogOpen(false);
        void inviteMutate();
      }
    } catch (error: unknown) {
      const err = error as ApiError;
      const detail = err.response?.data?.detail;
      toast({
        title: 'Error',
        description: detail !== undefined && detail !== '' ? detail : 'Failed to send invitation',
        variant: 'destructive',
      });
    }
  };

  return (
    <>
      <SidebarMenuItem>
        <SidebarMenuButton
          onClick={() => {
            setEmail('');
            setRoleId(ROLES[1]?.id ?? '');
            setIsInviteDialogOpen(true);
          }}
          tooltip='Invite Member'
        >
          <LuUsers className='w-4 h-4' />
          <span>Invite Member</span>
        </SidebarMenuButton>
      </SidebarMenuItem>
      <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Member</DialogTitle>
          </DialogHeader>
          <div className='grid gap-4 py-4'>
            <Input
              type='email'
              value={email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
              placeholder='Enter email address'
              required
            />
            <Select value={roleId} onValueChange={setRoleId}>
              <SelectTrigger>
                <SelectValue placeholder='Select role' />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Role</SelectLabel>
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={role.id.toString()}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setIsInviteDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={(e: React.MouseEvent) => void handleSubmit(e)}>Send Invitation</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
