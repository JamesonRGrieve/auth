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
import {
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import axios from 'axios';
import { getCookie, setCookie } from 'cookies-next';
import { useEffect, useState } from 'react';
import { LuCheck, LuPencil, LuPlus, LuUsers } from 'react-icons/lu';
import { useTeam, useTeams } from '../hooks/useTeam';
import { useToast } from '@/hooks/useToast';

const ROLES = [
  { id: 2, name: 'Admin' },
  { id: 3, name: 'User' },
];

const AUTHORIZED_ROLES = [0, 1, 2];

export const Team = () => {
  const [email, setEmail] = useState('');
  const [roleId, setRoleId] = useState('3');
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [newParent, setNewParent] = useState('');
  const [newName, setNewName] = useState('');
  const { toast } = useToast();

  const { data: teamData } = useTeams();
  const { data: activeTeam, mutate } = useTeam();

  const handleConfirmRename = async () => {
    try {
      const jwt = getCookie('jwt') as string;
      await axios.put(
        `${process.env.NEXT_PUBLIC_API_URI}/v1/teams/${activeTeam?.id}`,
        { name: newName },
        {
          headers: {
            Authorization: jwt,
            'Content-Type': 'application/json',
          },
        },
      );
      setIsRenameDialogOpen(false);
      mutate();
      toast({
        title: 'Success',
        description: 'Team name updated successfully!',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.detail || 'Failed to update team name',
        variant: 'destructive',
      });
    }
  };

  const handleConfirmCreate = async () => {
    try {
      const jwt = getCookie('jwt') as string;
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URI}/v1/teams`,
        {
          name: newName,
          agent_name: newName + ' Agent',
          ...(newParent ? { parent_company_id: newParent } : {}),
        },
        {
          headers: {
            Authorization: jwt,
            'Content-Type': 'application/json',
          },
        },
      );
      mutate();
      setIsCreateDialogOpen(false);
      toast({
        title: 'Success',
        description: 'Team created successfully!',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.detail || 'Failed to create team',
        variant: 'destructive',
      });
    }
  };

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

    try {
      const jwt = getCookie('jwt') as string;
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URI}/v1/invitations`,
        {
          email: email,
          role_id: parseInt(roleId),
          team_id: teamData?.[0]?.id,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: jwt,
          },
        },
      );

      if (response.status === 200) {
        if (response.data?.id) {
          toast({
            title: 'Success',
            description: `Invitation sent successfully! The invite link is ${process.env.NEXT_PUBLIC_APP_URI}/?invitation_id=${response.data.id}&email=${email}`,
          });
        } else {
          toast({
            title: 'Success',
            description: 'Invitation sent successfully!',
          });
        }
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
    <SidebarContent title='Team Management'>
      {activeTeam && (
        <SidebarGroup>
          <SidebarGroupLabel>{activeTeam?.name}</SidebarGroupLabel>
          <div className='space-y-2 px-2'>
            {activeTeam?.description && (
              <div className='text-sm text-muted-foreground'>
                <span className='font-medium'>Description:</span> {activeTeam.description}
              </div>
            )}
            {activeTeam?.parentId && (
              <div className='text-sm text-muted-foreground'>
                <span className='font-medium'>Parent Team ID:</span> {activeTeam.parentId}
              </div>
            )}
            {activeTeam?.agents && activeTeam.agents.length > 0 && (
              <div className='text-sm text-muted-foreground'>
                <span className='font-medium'>Agents:</span>
                <ul className='list-disc list-inside mt-1'>
                  {activeTeam.agents.map((agent) => (
                    <li key={agent.id}>{agent.name}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </SidebarGroup>
      )}
      <SidebarGroup>
        <SidebarGroupLabel>Team Functions</SidebarGroupLabel>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => {
                setNewName(activeTeam?.name || '');
                setIsRenameDialogOpen(true);
              }}
              tooltip='Rename Team'
            >
              <LuPencil className='w-4 h-4' />
              <span>Rename Team</span>
            </SidebarMenuButton>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => {
                setNewName('');
                setNewParent('');
                setIsCreateDialogOpen(true);
              }}
              tooltip='Create Team'
            >
              <LuPlus className='w-4 h-4' />
              <span>Create Team</span>
            </SidebarMenuButton>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => {
                setEmail('');
                setRoleId('3');
                setIsInviteDialogOpen(true);
              }}
              tooltip='Invite Member'
            >
              <LuUsers className='w-4 h-4' />
              <span>Invite Member</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroup>

      <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Team</DialogTitle>
          </DialogHeader>
          <div className='grid gap-4 py-4'>
            <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder='Enter new name' />
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setIsRenameDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmRename}>Rename</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Team</DialogTitle>
          </DialogHeader>
          <div className='grid gap-4 py-4'>
            <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder='Enter team name' />
            <Select value={newParent} onValueChange={(value) => setNewParent(value)}>
              <SelectTrigger>
                <SelectValue placeholder='(Optional) Select a Parent Team' />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Parent Team</SelectLabel>
                  <SelectItem value='-'>[NONE]</SelectItem>
                  {teamData?.map((child: any) => (
                    <SelectItem key={child.id} value={child.id}>
                      {child.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant='outline' onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmCreate}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Member</DialogTitle>
          </DialogHeader>
          <div className='grid gap-4 py-4'>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder='Enter email address' type='email' />
            <Select value={roleId} onValueChange={setRoleId}>
              <SelectTrigger>
                <SelectValue placeholder='Select role' />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Role</SelectLabel>
                  {ROLES.map((role) => (
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
    </SidebarContent>
  );
};

export default Team;
