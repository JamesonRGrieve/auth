'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import axios from 'axios';
import { getCookie } from 'cookies-next';
import { useEffect, useState } from 'react';
import { LuUsers } from 'react-icons/lu';
import { useToast } from '@/hooks/useToast';

const ROLES = [
  { id: 'FFFFFFFF-0000-0000-AAAA-FFFFFFFFFFFF', name: 'Admin' },
  { id: 'FFFFFFFF-0000-0000-0000-FFFFFFFFFFFF', name: 'User' },
];

interface Role {
  id: number;
  name: string;
  parent_id?: number;
  [key: string]: any;
}

interface RoleWithChildren extends Role {
  children: RoleWithChildren[];
  depth: number;
}

export const InviteDialog = ({ selectedTeam }: { selectedTeam: any }) => {
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [roleId, setRoleId] = useState(ROLES[1].id);
  const [roles, setRoles] = useState(ROLES);
  const { toast } = useToast();

  const fetchRoles = async () => {
    return (
      await axios.get(`${process.env.NEXT_PUBLIC_API_URI}/v1/team/${selectedTeam.id}/role`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getCookie('jwt')}`,
        },
        validateStatus: (status) => [200, 403].includes(status),
      })
    ).data;
  };

  function sortRolesByPermission(roles: Role[]): Role[] {
    const roleMap = new Map<number, RoleWithChildren>();
    roles.forEach((role: Role) => {
      roleMap.set(role.id, { ...role, children: [], depth: -1 });
    });

    roleMap.forEach((role: RoleWithChildren) => {
      if (role.parent_id && roleMap.has(role.parent_id)) {
        roleMap.get(role.parent_id)!.children.push(role);
      }
    });

    function assignDepth(role: RoleWithChildren, depth: number): void {
      role.depth = depth;
      role.children.forEach((child: RoleWithChildren) => assignDepth(child, depth + 1));
    }

    roleMap.forEach((role: RoleWithChildren) => {
      if (!role.parent_id) {
        assignDepth(role, 0);
      }
    });

    const sortedRoles = Array.from(roleMap.values()).sort((a, b) => a.depth - b.depth);

    return sortedRoles.map(({ children, depth, ...role }) => role as Role);
  }

  useEffect(() => {
    if (selectedTeam) {
      fetchRoles()
        .then((data) => {
          const sortedRoles = sortRolesByPermission(data.roles);
          setRoles([...ROLES, ...sortedRoles]);
        })
        .catch(() => setRoles(ROLES));
    }
  }, [selectedTeam]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      toast({
        title: 'Error',
        description: 'Please enter an email to invite.',
        variant: 'destructive',
      });
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

    const invalidEmails = emailArray.filter((email) => !emailRegex.test(email.trim()));

    if (invalidEmails.length > 0) {
      toast({
        title: 'Error',
        description: 'Invalid emails found: ' + invalidEmails.join(', '),
        variant: 'destructive',
      });
      return;
    }
    const body = {
      invitations: emailArray.map((email) => ({
        email: email.trim(),
        role_id: roleId,
        team_id: selectedTeam.id,
      })),
    };

    try {
      const jwt = getCookie('jwt') as string;
      const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URI}/v1/invitation`, body, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwt}`,
        },
      });

      if (response.status === 201) {
        toast({
          title: 'Success',
          description: 'Invitation sent successfully!',
        });
        setEmail('');
        setIsInviteDialogOpen(false);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.detail || 'Failed to send invitation',
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
            setRoleId(ROLES[1].id);
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
              onChange={(e) => setEmail(e.target.value)}
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
            <Button onClick={handleSubmit}>Send Invitation</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
